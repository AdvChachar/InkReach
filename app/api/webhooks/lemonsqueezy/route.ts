import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifySignature(body, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return Response.json({ error: "Service role key not configured" }, { status: 500 });
  }

  let event: { meta?: { event_name?: string }; data?: { attributes?: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = event?.meta?.event_name;

  if (eventName === "subscription_created" || eventName === "subscription_updated") {
    const attrs = event?.data?.attributes || {};
    const userEmail = attrs.user_email as string || (attrs.customer_email as string);
    const status = attrs.status as string;
    const subId = attrs.id as string || (attrs.subscription_id as string);
    const expiresAt = attrs.renews_at as string || attrs.ends_at as string;

    if (userEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", userEmail)
        .single();

      if (profile) {
        const isActive = status === "active" || status === "on_trial";
        await supabase
          .from("profiles")
          .update({
            subscription_status: isActive ? "pro" : "free",
            subscription_id: subId || null,
            pro_expires_at: isActive ? expiresAt : null,
          })
          .eq("id", profile.id);
      }
    }
  }

  if (eventName === "subscription_cancelled") {
    const attrs = event?.data?.attributes || {};
    const userEmail = attrs.user_email as string || (attrs.customer_email as string);

    if (userEmail) {
      await supabase
        .from("profiles")
        .update({ subscription_status: "cancelled" })
        .eq("email", userEmail);
    }
  }

  if (eventName === "subscription_expired") {
    const attrs = event?.data?.attributes || {};
    const userEmail = attrs.user_email as string || (attrs.customer_email as string);

    if (userEmail) {
      await supabase
        .from("profiles")
        .update({ subscription_status: "expired", subscription_id: null, pro_expires_at: null })
        .eq("email", userEmail);
    }
  }

  return Response.json({ received: true });
}
