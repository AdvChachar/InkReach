import { createServerSupabase } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!caller?.is_admin) {
    return Response.json({ error: "Admins only" }, { status: 403 });
  }

  const { targetUserId, action } = await req.json();
  if (!targetUserId) {
    return Response.json({ error: "targetUserId required" }, { status: 400 });
  }

  const admin = getServiceSupabase();
  if (!admin) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  if (action === "remove") {
    await admin.from("profiles").update({ subscription_status: "free", subscription_id: null, pro_expires_at: null }).eq("id", targetUserId);
  } else {
    await admin.from("profiles").update({
      subscription_status: "pro",
      pro_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", targetUserId);
  }

  return Response.json({ success: true });
}
