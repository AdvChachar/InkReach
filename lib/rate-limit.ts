import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServiceSupabase } from "./supabase-admin";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

async function createRateLimitClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

export async function checkRateLimit(userId: string, proMax = 100, existingSupabase?: any): Promise<RateLimitResult> {
  const supabase = existingSupabase || await createRateLimitClient();

  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_gen_count, last_gen_date, subscription_status")
    .eq("id", userId)
    .single();

  if (!profile) {
    const admin = getServiceSupabase();
    if (admin) {
      await admin.from("profiles").upsert(
        { id: userId, daily_gen_count: 1, last_gen_date: today, subscription_status: "free" },
        { onConflict: "id" }
      );
    }
    return { allowed: true, remaining: 4 };
  }

  const isPro = profile.subscription_status === "pro";
  const maxGenerations = isPro ? proMax : 5;

  if (profile.last_gen_date !== today) {
    await supabase
      .from("profiles")
      .update({ daily_gen_count: 1, last_gen_date: today })
      .eq("id", userId);
    return { allowed: true, remaining: maxGenerations - 1 };
  }

  const currentCount = profile.daily_gen_count || 0;

  if (currentCount >= maxGenerations) {
    const resetMsg = isPro
      ? `Daily generation limit reached (${proMax}/day). Resets at midnight UTC.`
      : "Free tier limit reached (5/day). Upgrade to Pro for 100/day.";
    return { allowed: false, remaining: 0, error: resetMsg };
  }

  await supabase
    .from("profiles")
    .update({ daily_gen_count: currentCount + 1 })
    .eq("id", userId);

  return { allowed: true, remaining: maxGenerations - currentCount - 1 };
}
