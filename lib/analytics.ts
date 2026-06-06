export type EventName =
  | "generate_hooks"
  | "generate_email"
  | "generate_pitch"
  | "character_chat"
  | "generate_image"
  | "generate_social"
  | "generate_video"
  | "email_sent"
  | "post_scheduled"
  | "post_posted"
  | "outreach_saved"
  | "outreach_status_change"
  | "book_switched"
  | "campaign_task_toggled";

export interface AnalyticsEvent {
  name: EventName;
  timestamp: string;
  bookTitle: string;
  meta?: Record<string, string | number>;
}

const STORAGE_KEY = "inkreach_analytics";

export function trackEvent(name: EventName, bookTitle: string, meta?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  const events = getEvents();
  events.push({ name, timestamp: new Date().toISOString(), bookTitle, meta });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function getEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function clearEvents() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getAnalyticsSummary(bookTitle?: string) {
  const events = bookTitle
    ? getEvents().filter((e) => e.bookTitle === bookTitle)
    : getEvents();

  const total = events.length;
  const byEvent: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  const byWeek: Record<string, number> = {};

  for (const e of events) {
    byEvent[e.name] = (byEvent[e.name] || 0) + 1;
    const day = e.timestamp.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
    const d = new Date(e.timestamp);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
  }

  const sortedDays = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  const sortedWeeks = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b));

  const thisWeek = sortedWeeks[sortedWeeks.length - 1]?.[1] || 0;
  const lastWeek = sortedWeeks[sortedWeeks.length - 2]?.[1] || 0;
  const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

  return {
    total,
    byEvent,
    byDay: sortedDays,
    byWeek: sortedWeeks,
    thisWeek,
    lastWeek,
    change,
  };
}
