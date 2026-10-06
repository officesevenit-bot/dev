import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, Volume2, VolumeX, LogOut, Calendar } from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  audioUnlocked: boolean;
  onUnlockAudio: () => void;
  activeAlarmsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onRefresh,
  isRefreshing,
  audioUnlocked,
  onUnlockAudio,
  activeAlarmsCount,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Bell className="w-5 h-5 text-white animate-pulse" />
            {activeAlarmsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[10px] font-bold text-white items-center justify-center">
                  {activeAlarmsCount}
                </span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                TaskAlarm
              </span>
              <span className="text-[11px] font-medium uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Google Calendar
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Today's due task alarms & audio triggers
            </p>
          </div>
        </div>

        {/* Live Clock Display */}
        <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-1.5 shadow-inner">
          <div className="flex flex-col items-center">
            <span className="font-mono text-sm sm:text-base font-semibold text-emerald-400 tracking-wider">
              {formattedTime}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Actions & User State */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Unlocked Indicator */}
          {!audioUnlocked ? (
            <button
              onClick={onUnlockAudio}
              title="Click to enable sound alarms"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Enable Audio</span>
            </button>
          ) : (
            <div
              title="Audio triggers enabled"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio Active</span>
            </div>
          )}

          {user ? (
            <>
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Sync Google Calendar"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                    {user.displayName || 'Connected'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <GoogleSignInButton onClick={onLogin} disabled={isLoggingIn} text={isLoggingIn ? 'Signing in...' : 'Sign in'} />
          )}
        </div>
      </div>
    </header>
  );
};
