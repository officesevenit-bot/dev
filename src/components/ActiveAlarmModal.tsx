import React from 'react';
import { Bell, Clock, CheckCircle2, Moon, ExternalLink, Video, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TriggeredAlarm } from '../types';
import { playSingleBurst, startAlarmLoop } from '../services/audioAlarm';

interface ActiveAlarmModalProps {
  alarm: TriggeredAlarm;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onMarkDone: () => void;
}

export const ActiveAlarmModal: React.FC<ActiveAlarmModalProps> = ({
  alarm,
  onDismiss,
  onSnooze,
  onMarkDone,
}) => {
  const handleDone = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    onMarkDone();
  };

  const handleRetriggerSound = () => {
    playSingleBurst(alarm.sound);
    startAlarmLoop(alarm.sound);
  };

  const formattedDueTime = alarm.dueTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      onClick={handleRetriggerSound}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/80 text-white overflow-hidden"
      >
        {/* Pulsing background effect */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative flex flex-col items-center text-center">
          {/* Animated Alarm Icon */}
          <div
            className="relative mb-4 cursor-pointer"
            onClick={handleRetriggerSound}
            title="Tap to test/boost sound"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/40">
              <Bell className="w-10 h-10 text-white animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500"></span>
            </span>
          </div>

          {/* Alarm Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            Alarm Triggered - Due Today!
          </div>

          {/* Quick Sound Boost / Replay Button for phones */}
          <button
            type="button"
            onClick={handleRetriggerSound}
            className="mb-3 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tap to Play Sound Loudly</span>
          </button>

          {/* Task Summary */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 max-w-md break-words">
            {alarm.eventSummary}
          </h2>

          {/* Time Due */}
          <div className="flex items-center gap-2 text-slate-300 font-mono text-sm bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/80 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Scheduled for {formattedDueTime}</span>
          </div>

          {/* Description / Notes if any */}
          {alarm.description && (
            <p className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-800 text-left w-full mb-4 max-h-24 overflow-y-auto leading-relaxed">
              {alarm.description}
            </p>
          )}

          {/* Video meeting link if present */}
          {alarm.hangoutLink && (
            <a
              href={alarm.hangoutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-medium mb-4 transition"
            >
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Join Google Meet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-700/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Done</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Stop Alarm</span>
            </button>
          </div>

          {/* Snooze options */}
          <div className="w-full flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Moon className="w-3.5 h-3.5" /> Snooze:
            </span>
            <button
              type="button"
              onClick={() => onSnooze(5)}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition cursor-pointer hover:text-white"
            >
              5 minutes
            </button>
            <button
              type="button"
              onClick={() => onSnooze(10)}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition cursor-pointer hover:text-white"
            >
              10 minutes
            </button>
            <button
              type="button"
              onClick={() => onSnooze(15)}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition cursor-pointer hover:text-white"
            >
              15 minutes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
