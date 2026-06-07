import { createClient } from "@supabase/supabase-js";

let adminClient: any = null;

export function getServiceSupabase() {
  if (adminClient) return adminClient;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return adminClient;
}
