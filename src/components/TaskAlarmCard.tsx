import React from 'react';
import {
  Bell,
  BellOff,
  Clock,
  ExternalLink,
  Trash2,
  Volume2,
  Video,
  MapPin,
  CheckCircle,
  AlertCircle,
  Play,
} from 'lucide-react';
import { CalendarEvent, TaskAlarmSettings, AlarmSoundType } from '../types';

interface TaskAlarmCardProps {
  event: CalendarEvent;
  alarmSettings: TaskAlarmSettings;
  currentTime: Date;
  onToggleAlarm: (enabled: boolean) => void;
  onUpdateOffset: (offsetMinutes: number) => void;
  onUpdateCustomTime: (timeStr: string) => void;
  onUpdateSound: (sound: AlarmSoundType) => void;
  onTestTaskAlarm: () => void;
  onRequestDelete: () => void;
  onDismissAlarm: () => void;
}

export const TaskAlarmCard: React.FC<TaskAlarmCardProps> = ({
  event,
  alarmSettings,
  currentTime,
  onToggleAlarm,
  onUpdateOffset,
  onUpdateCustomTime,
  onUpdateSound,
  onTestTaskAlarm,
  onRequestDelete,
  onDismissAlarm,
}) => {
  const isOngoing =
    currentTime >= event.startTime && currentTime <= event.endTime;
  const isPast = currentTime > event.endTime;
  const msUntilStart = event.startTime.getTime() - currentTime.getTime();

  // Compute countdown string
  let countdownText = '';
  if (isPast) {
    countdownText = 'Ended';
  } else if (isOngoing) {
    const msLeft = event.endTime.getTime() - currentTime.getTime();
    const minsLeft = Math.floor(msLeft / 60000);
    countdownText = `Active now (${minsLeft}m left)`;
  } else {
    const totalSecs = Math.max(0, Math.floor(msUntilStart / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      countdownText = `In ${hours}h ${mins}m`;
    } else if (mins > 0) {
      countdownText = `In ${mins}m ${secs}s`;
    } else {
      countdownText = `In ${secs}s`;
    }
  }

  // Format time strings
  const startTimeStr = event.startTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const endTimeStr = event.endTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate actual target alarm time for today
  let targetAlarmDate: Date = new Date(event.startTime);
  if (alarmSettings.offsetMinutes > 0) {
    targetAlarmDate = new Date(event.startTime.getTime() - alarmSettings.offsetMinutes * 60 * 1000);
  } else if (alarmSettings.offsetMinutes === -1 && alarmSettings.customTimeString) {
    const [hh, mm] = alarmSettings.customTimeString.split(':').map(Number);
    if (!isNaN(hh) && !isNaN(mm)) {
      targetAlarmDate = new Date();
      targetAlarmDate.setHours(hh, mm, 0, 0);
    }
  }

  const targetAlarmTimeStr = targetAlarmDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isSnoozed =
    alarmSettings.snoozedUntil && alarmSettings.snoozedUntil > currentTime.getTime();

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOngoing
          ? 'bg-slate-900/90 border-indigo-500/50 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/30'
          : isPast
          ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
          : alarmSettings.enabled
          ? 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600 shadow-md'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* Top Banner Status Bar */}
      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-800/30">
        <div className="flex items-center gap-2">
          {isOngoing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              In Progress
            </span>
          ) : isPast ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
              <CheckCircle className="w-3.5 h-3.5" />
              Past Due
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {countdownText}
            </span>
          )}

          {event.isAllDay && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              All-Day Task
            </span>
          )}

          {isSnoozed && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
              Snoozed ({Math.ceil((alarmSettings.snoozedUntil! - currentTime.getTime()) / 60000)}m left)
            </span>
          )}
        </div>

        {/* Alarm ON / OFF Switch */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={`text-xs font-semibold ${alarmSettings.enabled ? 'text-amber-300' : 'text-slate-400'}`}>
              {alarmSettings.enabled ? 'Alarm Active' : 'Alarm Off'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={alarmSettings.enabled}
              onClick={() => onToggleAlarm(!alarmSettings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                alarmSettings.enabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                  alarmSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight break-words mb-1">
              {event.summary}
            </h3>

            {/* Time Span */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mb-2">
              <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                {event.isAllDay ? 'Today (All Day)' : `${startTimeStr} – ${endTimeStr}`}
              </span>

              {alarmSettings.enabled && (
                <span className="text-amber-300 font-medium flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  Alarm at: <span className="font-mono">{targetAlarmTimeStr}</span>
                </span>
              )}
            </div>

            {/* Description or details */}
            {event.description && (
              <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                {event.description}
              </p>
            )}

            {/* Metadata links: Location or Video */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {event.location && (
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[200px]">{event.location}</span>
                </span>
              )}
              {event.hangoutLink && (
                <a
                  href={event.hangoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition"
                >
                  <Video className="w-3 h-3" />
                  <span>Google Meet</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Actions (Test sound, Google Cal link, Delete) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {alarmSettings.enabled && (
              <button
                type="button"
                onClick={onTestTaskAlarm}
                title="Preview alarm sound for this task"
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            {event.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                title="View in Google Calendar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onRequestDelete}
              title="Delete task from Google Calendar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detailed Alarm Config Panel (Expanded when Alarm is ON) */}
        {alarmSettings.enabled && (
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 bg-slate-800/40 -mx-5 -mb-5 p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Trigger Timing Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-medium">Trigger Alert:</span>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { offset: 0, label: 'At due time' },
                  { offset: 5, label: '5m before' },
                  { offset: 10, label: '10m before' },
                  { offset: 15, label: '15m before' },
                  { offset: -1, label: 'Custom' },
                ].map((opt) => (
                  <button
                    key={opt.offset}
                    type="button"
                    onClick={() => onUpdateOffset(opt.offset)}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                      alarmSettings.offsetMinutes === opt.offset
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* If Custom chosen: Time Input */}
              {alarmSettings.offsetMinutes === -1 && (
                <input
                  type="time"
                  value={alarmSettings.customTimeString || '09:00'}
                  onChange={(e) => onUpdateCustomTime(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              )}
            </div>

            {/* Custom Sound for Task */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Tone:</span>
              <select
                value={alarmSettings.sound}
                onChange={(e) => onUpdateSound(e.target.value as AlarmSoundType)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="digital">Digital Chime</option>
                <option value="zen">Zen Marimba</option>
                <option value="radar">Radar Ping</option>
                <option value="classic">Classic Bell</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
