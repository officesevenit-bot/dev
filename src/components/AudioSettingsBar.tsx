import React from 'react';
import { Volume2, BellRing, Play, Check, ShieldAlert } from 'lucide-react';
import { AlarmSoundType } from '../types';

interface AudioSettingsBarProps {
  volume: number;
  onVolumeChange: (vol: number) => void;
  selectedSound: AlarmSoundType;
  onSoundChange: (sound: AlarmSoundType) => void;
  onTestSound: () => void;
  notificationsEnabled: boolean;
  onRequestNotifications: () => void;
  audioUnlocked: boolean;
  onUnlockAudio: () => void;
}

const SOUND_OPTIONS: { id: AlarmSoundType; label: string; desc: string }[] = [
  { id: 'digital', label: 'Digital Chime', desc: 'Crisp energetic alert' },
  { id: 'zen', label: 'Zen Marimba', desc: 'Harmonic melodic bell' },
  { id: 'radar', label: 'Radar Ping', desc: 'Urgent sweeping pulse' },
  { id: 'classic', label: 'Classic Bell', desc: 'Twin acoustic ring' },
];

export const AudioSettingsBar: React.FC<AudioSettingsBarProps> = ({
  volume,
  onVolumeChange,
  selectedSound,
  onSoundChange,
  onTestSound,
  notificationsEnabled,
  onRequestNotifications,
  audioUnlocked,
  onUnlockAudio,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 text-slate-200 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Sound Selection */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-amber-400" />
            Alarm Ringtone:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSoundChange(opt.id);
                  onTestSound();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  selectedSound === opt.id
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                }`}
                title={opt.desc}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Test Controls */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-24 sm:w-28 accent-indigo-500 cursor-pointer"
              title={`Alarm Volume: ${Math.round(volume * 100)}%`}
            />
            <span className="font-mono text-xs text-slate-400 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={onTestSound}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer hover:border-slate-500 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Test Sound</span>
          </button>

          {/* Desktop Push Notification Permission */}
          <button
            type="button"
            onClick={onRequestNotifications}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
              notificationsEnabled
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Get desktop alerts even when this tab is in the background"
          >
            {notificationsEnabled ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Desktop Alerts On</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Enable Desktop Alerts</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile sound guidance and status banner */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-amber-400 font-semibold">📱 Phone Tip:</span>
          <span>Ensure your phone is not in Silent/Vibrate mode and ringer switch is ON.</span>
        </div>

        {!audioUnlocked ? (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-amber-300">Tap to unlock phone audio:</span>
            <button
              type="button"
              onClick={onUnlockAudio}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition cursor-pointer text-xs"
            >
              Activate Sound
            </button>
          </div>
        ) : (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Mobile Audio & Vibration Primed
          </span>
        )}
      </div>
    </div>
  );
};
