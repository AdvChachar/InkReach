'use client';

import { useState, useEffect } from "react";
import { getAnalyticsSummary, clearEvents, type AnalyticsEvent, getEvents } from "@/lib/analytics";
import { useBook } from "@/context/book-context";

export function Analytics() {
  const { activeBook } = useBook();
  const [summary, setSummary] = useState(() => getAnalyticsSummary(activeBook?.title));
  const [allEvents, setAllEvents] = useState<AnalyticsEvent[]>([]);
  const [period, setPeriod] = useState<"all" | "book">("all");

  useEffect(() => {
    setSummary(getAnalyticsSummary(period === "book" ? activeBook?.title : undefined));
    setAllEvents(getEvents().reverse());
  }, [period, activeBook]);

  const eventLabels: Record<string, string> = {
    generate_hooks: "TikTok Hooks",
    generate_email: "Email Sequences",
    generate_pitch: "Influencer Pitches",
    character_chat: "Character Chat",
    generate_image: "Book Mockups",
    generate_social: "Social Posts",
    generate_video: "Video Generations",
    email_sent: "Emails Sent",
    post_scheduled: "Posts Scheduled",
    post_posted: "Posts Posted",
    outreach_saved: "Outreach Saved",
    outreach_status_change: "Status Changes",
    book_switched: "Book Switches",
    campaign_task_toggled: "Tasks Completed",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted">Track usage and content generation stats.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === "all" ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted"}`}
          >
            All Books
          </button>
          <button
            onClick={() => setPeriod("book")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === "book" ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted"}`}
          >
            Current Book
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-accent-dim rounded-xl p-4">
          <p className="text-2xl font-bold text-accent">{summary.total}</p>
          <p className="text-xs text-muted">Total Events</p>
        </div>
        <div className="bg-card border border-accent-dim rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{summary.thisWeek}</p>
          <p className="text-xs text-muted">This Week</p>
        </div>
        <div className="bg-card border border-accent-dim rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{summary.lastWeek}</p>
          <p className="text-xs text-muted">Last Week</p>
        </div>
        <div className="bg-card border border-accent-dim rounded-xl p-4">
          <p className={`text-2xl font-bold ${summary.change >= 0 ? "text-green-400" : "text-red-400"}`}>
            {summary.change > 0 ? "+" : ""}{summary.change}%
          </p>
          <p className="text-xs text-muted">Week-over-Week</p>
        </div>
      </div>

      <div className="bg-card border border-accent-dim rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-medium text-foreground">By Feature</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(eventLabels).map(([key, label]) => {
            const count = summary.byEvent[key] || 0;
            const max = Math.max(...Object.values(summary.byEvent), 1);
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{label}</span>
                  <span className="text-muted">{count}</span>
                </div>
                <div className="w-full bg-accent-dim rounded-full h-1.5">
                  <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {summary.byDay.length > 0 && (
        <div className="bg-card border border-accent-dim rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Daily Activity</h3>
          <div className="flex items-end gap-1 h-24">
            {summary.byDay.map(([day, count]) => {
              const max = Math.max(...summary.byDay.map(([, c]) => c), 1);
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted">{count}</span>
                  <div className="w-full bg-accent rounded-t transition-all" style={{ height: `${(count / max) * 100}%`, minHeight: 4 }} />
                  <span className="text-[8px] text-muted rotate-45 origin-left whitespace-nowrap">{day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allEvents.length > 0 && (
        <div className="bg-card border border-accent-dim rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-accent-dim flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Event History</span>
            <button
              onClick={() => { clearEvents(); setAllEvents([]); setSummary(getAnalyticsSummary()); }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          <div className="divide-y divide-accent-dim max-h-80 overflow-y-auto">
            {allEvents.slice(0, 100).map((event, i) => (
              <div key={i} className="px-5 py-2 flex items-center justify-between text-sm">
                <div>
                  <span className="text-foreground">{eventLabels[event.name] || event.name}</span>
                  {event.meta && Object.keys(event.meta).length > 0 && (
                    <span className="text-muted text-xs ml-2">
                      ({Object.entries(event.meta).map(([k, v]) => `${k}:${v}`).join(", ")})
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted text-right">
                  <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                  <div>{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.total === 0 && (
        <div className="bg-card border border-accent-dim rounded-xl p-8 text-center text-sm text-muted">
          No activity yet. Use the marketing tools to generate content and it will appear here.
        </div>
      )}
    </div>
  );
}
