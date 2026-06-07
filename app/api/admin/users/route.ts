import { createServerSupabase } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/supabase-admin";

export async function GET(req: Request) {
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

  const admin = getServiceSupabase();
  if (!admin) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
  const { data: usage } = await admin.from("usage_logs").select("*");

  return Response.json({ profiles: profiles || [], usage: usage || [] });
}
