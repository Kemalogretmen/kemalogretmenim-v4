export type AgendaReminder = {
  id: string; title: string; date: string; time: string;
  done?: boolean; remind?: boolean; body?: string; minutesBefore?: number;
};
export type PlannedReminder = AgendaReminder & { at: number; fingerprint: string; identifier: string };
export const REMINDER_PREFIX = 'kemal.agenda.v2.';
export const REMINDER_LIMIT = 40;

// Preserve the web agenda's established reminder vocabulary and all-day 09:00 default.
export function teacherAgendaReminders(events: unknown): AgendaReminder[] {
  if (!Array.isArray(events)) return [];
  const offsets: Record<string, number> = { atTime: 0, '1h': 60, '1d': 1440, '1w': 10080, '0': 0 };
  return events.filter(e => e && typeof e.id === 'string').map(e => {
    const minutesBefore = typeof e.reminder === 'string' && Object.prototype.hasOwnProperty.call(offsets, e.reminder) ? offsets[e.reminder] : undefined;
    return { id: e.id, title: typeof e.title === 'string' ? e.title : '', date: String(e.date || ''), time: String(e.time || '09:00'), done: e.done === true, remind: minutesBefore !== undefined, minutesBefore };
  });
}

export function planReminders(userId: string, items: AgendaReminder[], now = Date.now()): PlannedReminder[] {
  if (!userId || !Array.isArray(items)) return [];
  const unique = new Map<string, PlannedReminder>();
  for (const item of items) {
    if (!item || !item.id || typeof item.title !== 'string' || !item.title.trim() || item.remind !== true || item.done || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) continue;
    const date = new Date(`${item.date}T${item.time}:00`);
    const minutesBefore = Number.isInteger(item.minutesBefore) && item.minutesBefore! >= 0 && item.minutesBefore! <= 10080 ? item.minutesBefore! : 0;
    const at = date.getTime() - minutesBefore * 60_000;
    if (!Number.isFinite(at) || at <= now || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== item.date) continue;
    const title = item.title.trim().slice(0, 160), body = String(item.body || '').slice(0, 200);
    const identifier = `${REMINDER_PREFIX}${encodeURIComponent(userId)}.${encodeURIComponent(item.id)}`;
    const fingerprint = JSON.stringify([at, title, body]);
    unique.set(identifier, { ...item, title, body, identifier, at, fingerprint });
  }
  return [...unique.values()].sort((a, b) => a.at - b.at).slice(0, REMINDER_LIMIT);
}

// OS/remote payloads are untrusted: only typed local identifiers can navigate.
export function reminderDestination(data: unknown, userId: string | null): { date: string } | null {
  if (!data || typeof data !== 'object' || !userId) return null;
  const value = data as Record<string, unknown>;
  if (value.kind !== 'agenda-reminder-v2' || value.owner !== userId || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  const date = new Date(`${value.date}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== value.date) return null;
  return { date: value.date };
}
