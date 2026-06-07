import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Tables = {
  profiles: {
    id: string;
    email: string | null;
    name: string | null;
    avatar_url: string | null;
    subscription_status: "free" | "pro" | "cancelled" | "expired";
    subscription_id: string | null;
    pro_expires_at: string | null;
    is_admin: boolean;
    daily_gen_count: number;
    last_gen_date: string | null;
    created_at: string;
  };
  books: {
    id: string;
    user_id: string;
    title: string;
    author_name: string;
    book_cover_url: string;
    book_blurb: string;
    book_genre: string;
    protagonist_name: string;
    protagonist_persona: string;
    book_tropes: string;
    target_reader: string;
    marketing_tone: string;
    manuscript_status: "none" | "uploading" | "analyzing" | "ready";
    created_at: string;
  };
  manuscript_analyses: {
    id: string;
    book_id: string;
    user_id: string;
    analysis: Record<string, unknown>;
    raw_text: string;
    created_at: string;
  };
  generated_content: {
    id: string;
    book_id: string;
    user_id: string;
    content_type: "hooks" | "email" | "pitch" | "social" | "ad" | "video";
    label: string;
    content: string;
    meta: Record<string, unknown>;
    created_at: string;
  };
  contacts: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    created_at: string;
  };
  outreach_contacts: {
    id: string;
    user_id: string;
    book_id: string | null;
    name: string;
    email: string;
    platform: string;
    follower_count: string;
    notes: string;
    status: "draft" | "sent" | "opened" | "replied" | "booked" | "declined";
    pitch: string;
    follow_up_date: string | null;
    created_at: string;
  };
  scheduled_posts: {
    id: string;
    user_id: string;
    book_id: string | null;
    platform: string;
    content: string;
    visual_concept: string;
    scheduled_for: string | null;
    status: "scheduled" | "posted";
    created_at: string;
  };
  giveaways: {
    id: string;
    user_id: string;
    title: string;
    description: string;
    prize: string;
    status: "draft" | "running" | "ended";
    entries: unknown[];
    winner: unknown | null;
    created_at: string;
  };
  ad_campaigns: {
    id: string;
    user_id: string;
    book_id: string | null;
    platform: string;
    headline: string;
    copy: string;
    cta: string;
    budget: string;
    audience: string;
    status: "draft" | "running" | "paused" | "ended";
    created_at: string;
  };
  usage_logs: {
    id: string;
    user_id: string;
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  };
};
