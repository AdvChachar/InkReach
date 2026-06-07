import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function requireSubscription() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { allowed: false, error: "Unauthorized. Please sign in.", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const isPro = profile?.subscription_status === "pro";

  if (!isPro) {
    return { allowed: false, error: "Pro subscription required. Visit /pricing to upgrade.", status: 403 };
  }

  return { allowed: true, user, profile, supabase };
}
