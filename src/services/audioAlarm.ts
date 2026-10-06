import { AlarmSoundType } from '../types';

let audioCtx: AudioContext | null = null;
let activeLoopInterval: number | null = null;
let isCurrentlyRinging = false;
let currentVolume = 0.85;

// Cache of generated HTML5 Audio elements for mobile fallback
const cachedAudioElements: Partial<Record<AlarmSoundType, HTMLAudioElement>> = {};
let isAudioUnlocked = false;

/**
 * Creates or retrieves the browser AudioContext safely across mobile & desktop.
 */
export const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

/**
 * Generates an in-memory WAV data URI for mobile browsers that restrict WebAudio oscillators.
 */
const generateWavDataUri = (soundType: AlarmSoundType): string => {
  const sampleRate = 22050;
  let duration = 0.8;
  if (soundType === 'zen') duration = 1.4;
  if (soundType === 'classic') duration = 0.9;
  if (soundType === 'radar') duration = 0.6;

  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Helper to write string to DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  // file length
  view.setUint32(4, 36 + numSamples * 2, true);
  // RIFF type
  writeString(8, 'WAVE');
  // format chunk identifier
  writeString(12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * 2)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample = 2)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * 2, true);

  // Synthesize audio samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (soundType === 'digital') {
      // 3 high-pitch alert beeps at 880Hz
      const beepInterval = 0.16;
      const beepDuration = 0.09;
      const beepIndex = Math.floor(t / beepInterval);
      if (beepIndex < 3) {
        const localT = t - beepIndex * beepInterval;
        if (localT < beepDuration) {
          const env = Math.sin((localT / beepDuration) * Math.PI);
          sample = Math.sign(Math.sin(2 * Math.PI * 880 * localT)) * 0.4 * env;
        }
      }
    } else if (soundType === 'zen') {
      // Harmonic chord chime
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const delay = idx * 0.06;
        if (t >= delay) {
          const localT = t - delay;
          const decay = Math.exp(-localT * 3.5);
          sample += (Math.sin(2 * Math.PI * freq * localT) / freqs.length) * decay * 0.7;
        }
      });
    } else if (soundType === 'radar') {
      // Upward chirp pulse
      const f0 = 400;
      const f1 = 1200;
      const sweepDuration = 0.3;
      if (t < sweepDuration) {
        const freq = f0 + (f1 - f0) * (t / sweepDuration);
        const env = Math.sin((t / sweepDuration) * Math.PI);
        sample = Math.sin(2 * Math.PI * freq * t) * 0.6 * env;
      }
    } else {
      // 'classic' twin bell chime
      const decay = Math.exp(-t * 4);
      sample =
        (Math.sin(2 * Math.PI * 720 * t) * 0.35 + Math.sin(2 * Math.PI * 724 * t) * 0.35) * decay;
    }

    // Clamp and write 16-bit PCM sample
    const clamped = Math.max(-1, Math.min(1, sample));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

/**
 * Preloads HTML5 Audio elements with synthesized WAV data for reliable mobile playback.
 */
const getHtmlAudio = (soundType: AlarmSoundType): HTMLAudioElement => {
  if (!cachedAudioElements[soundType]) {
    try {
      const dataUri = generateWavDataUri(soundType);
      const audio = new Audio(dataUri);
      audio.preload = 'auto';
      audio.volume = currentVolume;
      cachedAudioElements[soundType] = audio;
    } catch (err) {
      console.warn('Could not build HTMLAudio element:', err);
    }
  }
  const el = cachedAudioElements[soundType]!;
  if (el) {
    el.volume = currentVolume;
  }
  return el;
};

/**
 * Unlocks the Web Audio pipeline and HTML5 audio element on mobile devices.
 * MUST be invoked during a user touch/click gesture.
 */
export const unlockAudio = async (): Promise<boolean> => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // 1. Play 1-sample silent sound through Web Audio to unlock iOS Safari
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    // 2. Unlock HTML5 Audio elements on mobile by playing and immediately pausing
    const soundTypes: AlarmSoundType[] = ['digital', 'zen', 'radar', 'classic'];
    for (const st of soundTypes) {
      const el = getHtmlAudio(st);
      if (el) {
        try {
          const playPromise = el.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                el.pause();
                el.currentTime = 0;
              })
              .catch(() => {
                // Ignore silent unlock aborts
              });
          }
        } catch {
          // ignore
        }
      }
    }

    isAudioUnlocked = true;
    return true;
  } catch (err) {
    console.warn('Audio unlock notice:', err);
    return false;
  }
};

export const setAlarmVolume = (vol: number) => {
  currentVolume = Math.max(0, Math.min(1, vol));
  // Sync to HTML5 audio elements
  Object.values(cachedAudioElements).forEach((el) => {
    if (el) el.volume = currentVolume;
  });
};

/**
 * Triggers phone hardware vibration if supported by the mobile device.
 */
export const triggerPhoneVibration = (pattern: number[] = [600, 250, 600, 250, 600]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
};

export const stopPhoneVibration = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
};

/**
 * Plays a single burst of the selected alarm sound using both WebAudio oscillator
 * and mobile HTML5 Audio fallback for maximum reliability on phones.
 */
export const playSingleBurst = (soundType: AlarmSoundType) => {
  // Trigger phone vibration for tactile feedback
  triggerPhoneVibration([300, 100, 300]);

  // Method 1: HTML5 Audio fallback (especially robust on iOS / Android browsers)
  try {
    const htmlAudio = getHtmlAudio(soundType);
    if (htmlAudio) {
      htmlAudio.currentTime = 0;
      htmlAudio.volume = currentVolume;
      const promise = htmlAudio.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          // Mobile autoplay restrictions might catch here; WebAudio handles below
        });
      }
    }
  } catch {
    // ignore
  }

  // Method 2: Web Audio API Oscillator synthesizer
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (soundType === 'digital') {
      const frequencies = [880, 880, 880];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        const startTime = now + i * 0.12;
        const endTime = startTime + 0.08;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3 * currentVolume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } else if (soundType === 'zen') {
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const startTime = now + idx * 0.06;
        const duration = 1.2;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime((0.35 * currentVolume) / chords.length, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } else if (soundType === 'radar') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.25);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25 * currentVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } else {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(700, now);
      osc2.frequency.setValueAtTime(704, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35 * currentVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    }
  } catch (err) {
    console.warn('WebAudio burst notice:', err);
  }
};

/**
 * Loops the alarm continuously until stopped, with physical phone vibration.
 */
export const startAlarmLoop = (soundType: AlarmSoundType) => {
  stopAlarmLoop();
  isCurrentlyRinging = true;

  // Immediate sound burst & strong phone vibration
  playSingleBurst(soundType);
  triggerPhoneVibration([800, 300, 800, 300, 800]);

  const interval = soundType === 'zen' ? 2200 : soundType === 'classic' ? 1200 : 1500;
  activeLoopInterval = window.setInterval(() => {
    if (isCurrentlyRinging) {
      playSingleBurst(soundType);
      triggerPhoneVibration([800, 300, 800, 300, 800]);
    }
  }, interval);
};

export const stopAlarmLoop = () => {
  isCurrentlyRinging = false;
  stopPhoneVibration();
  if (activeLoopInterval !== null) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
};

export const isAlarmRinging = () => isCurrentlyRinging;
export const getIsAudioUnlocked = () => isAudioUnlocked;
