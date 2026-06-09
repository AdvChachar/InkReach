import { createServerSupabase } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const supabase = await createServerSupabase(req);
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
  const { data: books } = await admin.from("books").select("book_cover_url");
  const { data: analyses } = await admin.from("manuscript_analyses").select("raw_text,analysis");
  const { data: genContent } = await admin.from("generated_content").select("content,meta");

  let totalBytes = 0;
  const addSize = (val: unknown) => {
    if (val) totalBytes += typeof val === "string" ? new Blob([val]).size : JSON.stringify(val).length;
  };
  (profiles || []).forEach((p: any) => { addSize(p.email); addSize(p.name); });
  (books || []).forEach((b: any) => addSize(b.book_cover_url));
  (analyses || []).forEach((a: any) => { addSize(a.raw_text); addSize(a.analysis); });
  (genContent || []).forEach((g: any) => { addSize(g.content); addSize(g.meta); });

  return Response.json({ profiles: profiles || [], usage: usage || [], storageBytes: totalBytes });
}
