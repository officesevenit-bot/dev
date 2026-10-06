import { CalendarEvent } from '../types';

export interface RawGoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export const fetchTodayEvents = async (
  accessToken: string,
  targetDate: Date = new Date()
): Promise<CalendarEvent[]> => {
  // Compute start of day and end of day in local time
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const timeMin = startOfDay.toISOString();
  const timeMax = endOfDay.toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');
  url.searchParams.append('maxResults', '100');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to fetch events: ${response.statusText}`);
  }

  const data = await response.json();
  const items: RawGoogleEvent[] = data.items || [];

  return items
    .filter((ev) => ev.status !== 'cancelled')
    .map((ev) => {
      const isAllDay = !ev.start?.dateTime && !!ev.start?.date;
      let startTime: Date;
      let endTime: Date;

      if (isAllDay && ev.start?.date) {
        // e.g., '2026-10-06'
        const parts = ev.start.date.split('-').map(Number);
        startTime = new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0); // default 9:00 AM for all-day task
        if (ev.end?.date) {
          const endParts = ev.end.date.split('-').map(Number);
          endTime = new Date(endParts[0], endParts[1] - 1, endParts[2], 10, 0, 0);
        } else {
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        }
      } else {
        startTime = ev.start?.dateTime ? new Date(ev.start.dateTime) : new Date();
        endTime = ev.end?.dateTime ? new Date(ev.end.dateTime) : new Date(startTime.getTime() + 30 * 60 * 1000);
      }

      return {
        id: ev.id,
        summary: ev.summary || '(Untitled Task / Event)',
        description: ev.description,
        location: ev.location,
        htmlLink: ev.htmlLink,
        hangoutLink: ev.hangoutLink,
        start: ev.start || {},
        end: ev.end || {},
        isAllDay,
        startTime,
        endTime,
        status: ev.status,
      };
    });
};

export interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  durationMinutes?: number;
  location?: string;
}

export const createCalendarEvent = async (
  accessToken: string,
  params: CreateEventParams
): Promise<CalendarEvent> => {
  const duration = params.durationMinutes || 30;
  const endTime = new Date(params.startTime.getTime() + duration * 60 * 1000);

  const payload = {
    summary: params.summary,
    description: params.description || '',
    location: params.location || '',
    start: {
      dateTime: params.startTime.toISOString(),
    },
    end: {
      dateTime: endTime.toISOString(),
    },
    reminders: {
      useDefault: true,
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create calendar event');
  }

  const created = await response.json();
  return {
    id: created.id,
    summary: created.summary || params.summary,
    description: created.description,
    location: created.location,
    htmlLink: created.htmlLink,
    hangoutLink: created.hangoutLink,
    start: created.start,
    end: created.end,
    isAllDay: false,
    startTime: params.startTime,
    endTime,
  };
};

export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string
): Promise<void> => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete event');
  }
};
