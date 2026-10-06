export type AlarmSoundType = 'digital' | 'zen' | 'radar' | 'classic';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start: {
    dateTime?: string;
    date?: string; // all-day event
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  isAllDay: boolean;
  startTime: Date;
  endTime: Date;
  status?: string;
}

export interface TaskAlarmSettings {
  enabled: boolean;
  offsetMinutes: number; // 0 = at due time, 5 = 5m before, 10 = 10m before, -1 = custom time
  customTimeString?: string; // HH:mm for today if custom
  sound: AlarmSoundType;
  snoozedUntil?: number | null; // timestamp ms
  triggeredToday?: boolean;
  dismissedToday?: boolean;
}

export interface TriggeredAlarm {
  eventId: string;
  eventSummary: string;
  dueTime: Date;
  alarmTime: Date;
  description?: string;
  hangoutLink?: string;
  sound: AlarmSoundType;
}

export interface AudioSettings {
  volume: number; // 0 to 1
  selectedSound: AlarmSoundType;
  notificationsEnabled: boolean;
  audioUnlocked: boolean;
}
