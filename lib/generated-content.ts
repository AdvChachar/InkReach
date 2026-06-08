export type ContentType = "hooks" | "email" | "pitch" | "social" | "ad" | "video";

export interface GeneratedItem {
  type: ContentType;
  label: string;
  content: string;
  meta?: Record<string, string>;
  generatedAt: string;
}

export interface GeneratedContentSet {
  bookId: string;
  items: GeneratedItem[];
  completedAt: string;
}

const STORAGE_PREFIX = "inkreach_generated_";

export function getGeneratedContent(bookId: string): GeneratedContentSet | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${bookId}`);
  return raw ? JSON.parse(raw) : null;
}

export function saveGeneratedContent(bookId: string, items: GeneratedItem[]) {
  if (typeof window === "undefined") return;
  const set: GeneratedContentSet = { bookId, items, completedAt: new Date().toISOString() };
  localStorage.setItem(`${STORAGE_PREFIX}${bookId}`, JSON.stringify(set));
}

export async function saveAndSyncGeneratedContent(bookId: string, items: GeneratedItem[], userId?: string) {
  saveGeneratedContent(bookId, items);
  if (userId) {
    await syncGeneratedToSupabase(userId);
  }
}

export function clearGeneratedContent(bookId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_PREFIX}${bookId}`);
}

export async function syncGeneratedFromSupabase(userId: string) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data } = await supabase
    .from("generated_content")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (data) {
    const grouped = new Map<string, GeneratedItem[]>();
    for (const row of data) {
      if (!grouped.has(row.book_id)) grouped.set(row.book_id, []);
      grouped.get(row.book_id)!.push({
        type: row.content_type as ContentType,
        label: row.label || "",
        content: row.content || "",
        meta: row.meta as Record<string, string> | undefined,
        generatedAt: row.created_at || new Date().toISOString(),
      });
    }
    for (const [bookId, items] of grouped) {
      localStorage.setItem(
        `${STORAGE_PREFIX}${bookId}`,
        JSON.stringify({ bookId, items, completedAt: new Date().toISOString() })
      );
    }
  }
}

export async function syncGeneratedToSupabase(userId: string) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const prefix = STORAGE_PREFIX;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const bookId = key.slice(prefix.length);
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const set = JSON.parse(raw) as GeneratedContentSet;
    if (!set.items?.length) continue;
    await supabase.from("generated_content").delete().eq("book_id", bookId).eq("user_id", userId);
    await supabase.from("generated_content").insert(
      set.items.map((item) => ({
        book_id: bookId,
        user_id: userId,
        content_type: item.type,
        label: item.label,
        content: item.content,
        meta: item.meta || {},
      }))
    );
  }
}
