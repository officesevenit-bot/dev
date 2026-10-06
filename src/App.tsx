/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Bell,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';
import {
  CalendarEvent,
  TaskAlarmSettings,
  TriggeredAlarm,
  AlarmSoundType,
} from './types';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
} from './services/firebase';
import {
  fetchTodayEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from './services/calendar';
import {
  startAlarmLoop,
  stopAlarmLoop,
  playSingleBurst,
  setAlarmVolume,
  unlockAudio,
} from './services/audioAlarm';
import { Navbar } from './components/Navbar';
import { AudioSettingsBar } from './components/AudioSettingsBar';
import { TaskAlarmCard } from './components/TaskAlarmCard';
import { ActiveAlarmModal } from './components/ActiveAlarmModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { ConfirmModal } from './components/ConfirmModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Events & Alarms state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [alarmSettingsMap, setAlarmSettingsMap] = useState<Record<string, TaskAlarmSettings>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Real-time ticking time
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Active ringing alarm
  const [activeAlarm, setActiveAlarm] = useState<TriggeredAlarm | null>(null);

  // Audio & Notification global settings
  const [volume, setVolume] = useState<number>(0.85);
  const [defaultSound, setDefaultSound] = useState<AlarmSoundType>('digital');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  // UI state: filter, search, modals
  const [filterMode, setFilterMode] = useState<'all' | 'upcoming' | 'alarms_on' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Confirmation modal for destructive operations
  const [deleteCandidate, setDeleteCandidate] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Alarm history log
  const [alarmHistory, setAlarmHistory] = useState<
    { id: string; summary: string; time: string; action: string }[]
  >([]);

  // Keep ref to latest settings and events for the timer loop
  const alarmSettingsRef = useRef(alarmSettingsMap);
  alarmSettingsRef.current = alarmSettingsMap;

  const eventsRef = useRef(events);
  eventsRef.current = events;

  const activeAlarmRef = useRef(activeAlarm);
  activeAlarmRef.current = activeAlarm;

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, userToken) => {
        setUser(authedUser);
        setToken(userToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Volume synchronization
  useEffect(() => {
    setAlarmVolume(volume);
  }, [volume]);

  // Mobile / touch gesture unlock listener
  useEffect(() => {
    const handleGestureUnlock = async () => {
      const ok = await unlockAudio();
      if (ok) {
        setAudioUnlocked(true);
      }
    };

    window.addEventListener('touchstart', handleGestureUnlock, { once: true, passive: true });
    window.addEventListener('touchend', handleGestureUnlock, { once: true, passive: true });
    window.addEventListener('click', handleGestureUnlock, { once: true });
    window.addEventListener('pointerdown', handleGestureUnlock, { once: true, passive: true });

    return () => {
      window.removeEventListener('touchstart', handleGestureUnlock);
      window.removeEventListener('touchend', handleGestureUnlock);
      window.removeEventListener('click', handleGestureUnlock);
      window.removeEventListener('pointerdown', handleGestureUnlock);
    };
  }, []);

  // Handle Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setFetchError(null);
    try {
      await unlockAudio();
      setAudioUnlocked(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        setFetchError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      // Only display message if it's not a user-initiated dismissal
      if (
        !msg.includes('popup-closed-by-user') &&
        !msg.includes('cancelled-popup-request')
      ) {
        setFetchError(msg);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    stopAlarmLoop();
    setActiveAlarm(null);
    await logout();
    setUser(null);
    setToken(null);
    setEvents([]);
    setAlarmSettingsMap({});
    setNeedsAuth(true);
  };

  // Fetch Today's Google Calendar Events
  const loadEvents = useCallback(async (accessToken: string) => {
    setIsLoadingEvents(true);
    setFetchError(null);
    try {
      const todayEvents = await fetchTodayEvents(accessToken, new Date());
      setEvents(todayEvents);

      // Prepopulate default alarm settings for newly fetched events
      setAlarmSettingsMap((prev) => {
        const next = { ...prev };
        todayEvents.forEach((ev) => {
          if (!next[ev.id]) {
            // Default: alarm enabled, at due time
            next[ev.id] = {
              enabled: true,
              offsetMinutes: 0,
              sound: defaultSound,
              triggeredToday: false,
              dismissedToday: false,
            };
          }
        });
        return next;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        setNeedsAuth(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load Google Calendar events';
        setFetchError(msg);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }, [defaultSound]);

  // Load events when token changes
  useEffect(() => {
    if (token) {
      loadEvents(token);
    }
  }, [token, loadEvents]);

  // Periodic Auto-Sync from Google Calendar (every 60 seconds)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadEvents(token);
    }, 60000);
    return () => clearInterval(interval);
  }, [token, loadEvents]);

  // Request native notifications
  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Audio unlock click handler
  const handleUnlockAudio = async () => {
    const success = await unlockAudio();
    if (success) {
      setAudioUnlocked(true);
      playSingleBurst(defaultSound);
    }
  };

  // Test sound
  const handleTestSound = () => {
    setAudioUnlocked(true);
    playSingleBurst(defaultSound);
  };

  // Trigger an alarm for a specific event
  const triggerAlarmForEvent = useCallback((event: CalendarEvent, settings: TaskAlarmSettings) => {
    const sound = settings.sound || defaultSound;
    const newAlarm: TriggeredAlarm = {
      eventId: event.id,
      eventSummary: event.summary,
      dueTime: event.startTime,
      alarmTime: new Date(),
      description: event.description,
      hangoutLink: event.hangoutLink,
      sound,
    };

    setActiveAlarm(newAlarm);
    startAlarmLoop(sound);

    // Add to history
    setAlarmHistory((prev) => [
      {
        id: `${event.id}-${Date.now()}`,
        summary: event.summary,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: 'Triggered Alarm',
      },
      ...prev.slice(0, 19),
    ]);

    // Send native desktop notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(`🔔 Due Now: ${event.summary}`, {
          body: `Scheduled for ${event.startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}. Click to view details.`,
          icon: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
        };
      } catch (err) {
        console.warn('Notification error:', err);
      }
    }
  }, [defaultSound]);

  // Master 1-Second Timer Engine: checks alarms for tasks due today
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Only check alarms if no alarm is currently actively ringing
      if (activeAlarmRef.current) {
        return;
      }

      const currentEvents = eventsRef.current;
      const currentMap = alarmSettingsRef.current;

      for (const ev of currentEvents) {
        const settings = currentMap[ev.id];
        if (!settings || !settings.enabled) continue;
        if (settings.triggeredToday || settings.dismissedToday) continue;

        // Calculate target alarm moment
        let alarmDate = new Date(ev.startTime);
        if (settings.offsetMinutes > 0) {
          alarmDate = new Date(ev.startTime.getTime() - settings.offsetMinutes * 60 * 1000);
        } else if (settings.offsetMinutes === -1 && settings.customTimeString) {
          const [hh, mm] = settings.customTimeString.split(':').map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            alarmDate = new Date(now);
            alarmDate.setHours(hh, mm, 0, 0);
          }
        }

        // Check snooze
        if (settings.snoozedUntil && now.getTime() < settings.snoozedUntil) {
          continue;
        }

        // Trigger condition: current time has reached or just passed alarmDate (within 30 minutes grace)
        const diffMs = now.getTime() - alarmDate.getTime();
        if (diffMs >= 0 && diffMs < 30 * 60 * 1000) {
          // Mark triggered in map
          setAlarmSettingsMap((prev) => ({
            ...prev,
            [ev.id]: {
              ...prev[ev.id],
              triggeredToday: true,
              snoozedUntil: null,
            },
          }));

          triggerAlarmForEvent(ev, settings);
          break; // Trigger one alarm at a time to prevent overlapping chaos
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [triggerAlarmForEvent]);

  // Modal Alarm actions
  const handleDismissActiveAlarm = () => {
    stopAlarmLoop();
    if (activeAlarm) {
      setAlarmSettingsMap((prev) => ({
        ...prev,
        [activeAlarm.eventId]: {
          ...prev[activeAlarm.eventId],
          dismissedToday: true,
        },
      }));
      setAlarmHistory((prev) => [
        {
          id: `dismiss-${Date.now()}`,
          summary: activeAlarm.eventSummary,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Stopped Alarm',
        },
        ...prev.slice(0, 19),
      ]);
    }
    setActiveAlarm(null);
  };

  const handleSnoozeActiveAlarm = (minutes: number) => {
    stopAlarmLoop();
    if (activeAlarm) {
      const snoozeMs = Date.now() + minutes * 60 * 1000;
      setAlarmSettingsMap((prev) => ({
        ...prev,
        [activeAlarm.eventId]: {
          ...prev[activeAlarm.eventId],
          snoozedUntil: snoozeMs,
          triggeredToday: false, // will re-trigger when snooze ends
          dismissedToday: false,
        },
      }));
      setAlarmHistory((prev) => [
        {
          id: `snooze-${Date.now()}`,
          summary: activeAlarm.eventSummary,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Snoozed for ${minutes} min`,
        },
        ...prev.slice(0, 19),
      ]);
    }
    setActiveAlarm(null);
  };

  const handleMarkDoneActiveAlarm = () => {
    stopAlarmLoop();
    if (activeAlarm) {
      setAlarmSettingsMap((prev) => ({
        ...prev,
        [activeAlarm.eventId]: {
          ...prev[activeAlarm.eventId],
          dismissedToday: true,
          triggeredToday: true,
        },
      }));
      setAlarmHistory((prev) => [
        {
          id: `done-${Date.now()}`,
          summary: activeAlarm.eventSummary,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Marked Completed 🎉',
        },
        ...prev.slice(0, 19),
      ]);
    }
    setActiveAlarm(null);
  };

  // Card alarm configuration updates
  const handleToggleAlarm = (eventId: string, enabled: boolean) => {
    setAlarmSettingsMap((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {
          offsetMinutes: 0,
          sound: defaultSound,
        }),
        enabled,
        // If enabling, reset triggered/dismissed so user can trigger it
        triggeredToday: false,
        dismissedToday: false,
      },
    }));
  };

  const handleUpdateOffset = (eventId: string, offsetMinutes: number) => {
    setAlarmSettingsMap((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || { enabled: true, sound: defaultSound }),
        offsetMinutes,
      },
    }));
  };

  const handleUpdateCustomTime = (eventId: string, customTimeString: string) => {
    setAlarmSettingsMap((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || { enabled: true, offsetMinutes: -1, sound: defaultSound }),
        customTimeString,
      },
    }));
  };

  const handleUpdateSound = (eventId: string, sound: AlarmSoundType) => {
    setAlarmSettingsMap((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || { enabled: true, offsetMinutes: 0 }),
        sound,
      },
    }));
  };

  const handleTestTaskAlarm = (eventId: string) => {
    setAudioUnlocked(true);
    const sound = alarmSettingsMap[eventId]?.sound || defaultSound;
    playSingleBurst(sound);
  };

  // Create task directly in Google Calendar
  const handleCreateTask = async (params: {
    summary: string;
    description: string;
    location: string;
    startTime: Date;
    durationMinutes: number;
    alarmEnabled: boolean;
    alarmOffsetMinutes: number;
    alarmSound: AlarmSoundType;
  }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      throw new Error('Please sign in to Google Calendar first.');
    }

    const created = await createCalendarEvent(accessToken, {
      summary: params.summary,
      description: params.description,
      location: params.location,
      startTime: params.startTime,
      durationMinutes: params.durationMinutes,
    });

    setEvents((prev) => [created, ...prev]);
    setAlarmSettingsMap((prev) => ({
      ...prev,
      [created.id]: {
        enabled: params.alarmEnabled,
        offsetMinutes: params.alarmOffsetMinutes,
        sound: params.alarmSound,
        triggeredToday: false,
        dismissedToday: false,
      },
    }));
  };

  // Delete task from Google Calendar (Destructive Operation with Mandatory Confirmation Dialog)
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setIsDeleting(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setNeedsAuth(true);
        return;
      }
      await deleteCalendarEvent(accessToken, deleteCandidate.id);
      setEvents((prev) => prev.filter((ev) => ev.id !== deleteCandidate.id));
      setAlarmSettingsMap((prev) => {
        const next = { ...prev };
        delete next[deleteCandidate.id];
        return next;
      });
      setDeleteCandidate(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((ev) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSummary = ev.summary.toLowerCase().includes(q);
      const matchDesc = ev.description?.toLowerCase().includes(q);
      if (!matchSummary && !matchDesc) return false;
    }

    // Filter mode
    const isPast = currentTime > ev.endTime;
    const isOngoing = currentTime >= ev.startTime && currentTime <= ev.endTime;
    const isUpcoming = currentTime < ev.startTime;
    const hasAlarm = alarmSettingsMap[ev.id]?.enabled;

    if (filterMode === 'upcoming') {
      return isUpcoming || isOngoing;
    }
    if (filterMode === 'alarms_on') {
      return hasAlarm;
    }
    if (filterMode === 'completed') {
      return isPast;
    }
    return true; // 'all'
  });

  // Count stats
  const activeAlarmsCount = events.filter(
    (ev) => alarmSettingsMap[ev.id]?.enabled && currentTime <= ev.endTime
  ).length;

  const upcomingCount = events.filter((ev) => currentTime < ev.startTime).length;
  const ongoingCount = events.filter(
    (ev) => currentTime >= ev.startTime && currentTime <= ev.endTime
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onRefresh={() => token && loadEvents(token)}
        isRefreshing={isLoadingEvents}
        audioUnlocked={audioUnlocked}
        onUnlockAudio={handleUnlockAudio}
        activeAlarmsCount={activeAlarmsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Not Authenticated Welcome Banner */}
        {needsAuth && !user && (
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 p-8 sm:p-10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Google Workspace Calendar Alarms
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                Never Miss a Task or Event Due Today
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Connect your Google Calendar to automatically monitor all events and tasks due today.
                Configure custom acoustic alarm sounds, precision countdown triggers, and snooze controls for specific tasks.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <GoogleSignInButton
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  text={isLoggingIn ? 'Connecting...' : 'Sign in with Google Calendar'}
                />

                <button
                  type="button"
                  onClick={handleUnlockAudio}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Test Alarm Audio</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio & Notification Controls Bar */}
        <AudioSettingsBar
          volume={volume}
          onVolumeChange={setVolume}
          selectedSound={defaultSound}
          onSoundChange={setDefaultSound}
          onTestSound={handleTestSound}
          notificationsEnabled={notificationsEnabled}
          onRequestNotifications={handleRequestNotifications}
          audioUnlocked={audioUnlocked}
          onUnlockAudio={handleUnlockAudio}
        />

        {/* Error Notification if any */}
        {fetchError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
            {token && (
              <button
                onClick={() => loadEvents(token)}
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Dashboard Controls: Header, Stats, Filter Tabs, Add Task Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Tasks & Events Due Today
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {events.length} total
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active alarm triggers: <span className="text-amber-400 font-semibold">{activeAlarmsCount}</span> • Upcoming: <span className="text-indigo-400 font-semibold">{upcomingCount}</span> • Ongoing: <span className="text-emerald-400 font-semibold">{ongoingCount}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search today's tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Schedule New Task Button */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  handleLogin();
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Task</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
          {[
            { id: 'all', label: 'All Tasks Today', count: events.length },
            { id: 'upcoming', label: 'Upcoming / Live', count: upcomingCount + ongoingCount },
            { id: 'alarms_on', label: 'Alarms Armed', count: activeAlarmsCount },
            { id: 'completed', label: 'Past / Ended', count: events.length - (upcomingCount + ongoingCount) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as typeof filterMode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                filterMode === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filterMode === tab.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Events Grid / Task List */}
        {isLoadingEvents ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">Syncing Google Calendar tasks for today...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((ev) => (
              <TaskAlarmCard
                key={ev.id}
                event={ev}
                alarmSettings={
                  alarmSettingsMap[ev.id] || {
                    enabled: false,
                    offsetMinutes: 0,
                    sound: defaultSound,
                  }
                }
                currentTime={currentTime}
                onToggleAlarm={(enabled) => handleToggleAlarm(ev.id, enabled)}
                onUpdateOffset={(offset) => handleUpdateOffset(ev.id, offset)}
                onUpdateCustomTime={(timeStr) => handleUpdateCustomTime(ev.id, timeStr)}
                onUpdateSound={(sound) => handleUpdateSound(ev.id, sound)}
                onTestTaskAlarm={() => handleTestTaskAlarm(ev.id)}
                onRequestDelete={() => setDeleteCandidate(ev)}
                onDismissAlarm={() => {
                  setAlarmSettingsMap((prev) => ({
                    ...prev,
                    [ev.id]: {
                      ...prev[ev.id],
                      dismissedToday: true,
                    },
                  }));
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No tasks due today matching this filter</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {user
                  ? 'All tasks are either complete or none are scheduled for today. Add a new task or refresh your calendar!'
                  : 'Sign in with Google to synchronize your schedule and set instant alarms.'}
              </p>
            </div>
            <div className="pt-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task for Today</span>
                </button>
              ) : (
                <GoogleSignInButton onClick={handleLogin} disabled={isLoggingIn} />
              )}
            </div>
          </div>
        )}

        {/* Alarm Activity History */}
        {alarmHistory.length > 0 && (
          <div className="mt-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Today's Alarm History
              </h4>
              <button
                type="button"
                onClick={() => setAlarmHistory([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                Clear log
              </button>
            </div>
            <div className="divide-y divide-slate-800/60">
              {alarmHistory.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{item.summary}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.action}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Active Triggering Alarm Modal (Overlay & Loop Sound) */}
      {activeAlarm && (
        <ActiveAlarmModal
          alarm={activeAlarm}
          onDismiss={handleDismissActiveAlarm}
          onSnooze={handleSnoozeActiveAlarm}
          onMarkDone={handleMarkDoneActiveAlarm}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
        defaultSound={defaultSound}
      />

      {/* Mandatory User Confirmation Modal for Destructive Delete */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Delete Google Calendar Task?"
        message={`Are you sure you want to permanently delete "${deleteCandidate?.summary}" from your Google Calendar? This action cannot be undone.`}
        confirmText="Delete Event"
        cancelText="Keep Event"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
}
