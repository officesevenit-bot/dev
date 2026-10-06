import React, { useState } from 'react';
import { X, CalendarPlus, Clock, Bell, FileText, MapPin } from 'lucide-react';
import { AlarmSoundType } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    summary: string;
    description: string;
    location: string;
    startTime: Date;
    durationMinutes: number;
    alarmEnabled: boolean;
    alarmOffsetMinutes: number;
    alarmSound: AlarmSoundType;
  }) => Promise<void>;
  defaultSound: AlarmSoundType;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultSound,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // Default to 1 hour from now or next half hour today
  const defaultHour = new Date();
  defaultHour.setMinutes(defaultHour.getMinutes() + 30);
  const initialTimeStr = `${String(defaultHour.getHours()).padStart(2, '0')}:${String(
    defaultHour.getMinutes()
  ).padStart(2, '0')}`;

  const [timeStr, setTimeStr] = useState(initialTimeStr);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmOffsetMinutes, setAlarmOffsetMinutes] = useState(0);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>(defaultSound);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError('Please provide a task or event title');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const [hours, mins] = timeStr.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, mins, 0, 0);

      await onCreate({
        summary: summary.trim(),
        description: description.trim(),
        location: location.trim(),
        startTime: scheduledDate,
        durationMinutes,
        alarmEnabled,
        alarmOffsetMinutes,
        alarmSound,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Task / Event Due Today</h2>
              <p className="text-xs text-slate-400">Syncs directly to your Google Calendar with alarms</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary / Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Task or Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Submit quarterly budget report, Team standup..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Time Due Today *
              </label>
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Alarm Trigger Options */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                Trigger Audible Alarm
              </span>
              <label className="relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={alarmEnabled}
                  onChange={(e) => setAlarmEnabled(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`inline-block h-5 w-10 rounded-full transition-colors ${
                    alarmEnabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform mt-0.75 ${
                      alarmEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </span>
              </label>
            </div>

            {alarmEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Trigger Moment</label>
                  <select
                    value={alarmOffsetMinutes}
                    onChange={(e) => setAlarmOffsetMinutes(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value={0}>At due time</option>
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Alarm Sound</label>
                  <select
                    value={alarmSound}
                    onChange={(e) => setAlarmSound(e.target.value as AlarmSoundType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
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

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Key deliverables, agenda, or reminders..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Location / Room (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Conference Room B, Zoom link..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition cursor-pointer border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding to Calendar...</span>
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4" />
                  <span>Schedule Task & Alarm</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
