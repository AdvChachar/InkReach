export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  characterName?: string;
}

const CHAT_PREFIX = "inkreach_chat_";

export function getChatHistory(bookId: string, charIndex: number): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${CHAT_PREFIX}${bookId}_${charIndex}`);
  return raw ? JSON.parse(raw) : [];
}

export function saveChatHistory(bookId: string, charIndex: number, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${CHAT_PREFIX}${bookId}_${charIndex}`, JSON.stringify(messages));
}

export function clearChatHistory(bookId: string, charIndex: number) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${CHAT_PREFIX}${bookId}_${charIndex}`);
}

export async function upsertChatToSupabase(userId: string, bookId: string, charIndex: number) {
  const messages = getChatHistory(bookId, charIndex);
  if (messages.length === 0) return;
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("chat_history")
    .select("id")
    .eq("book_id", bookId)
    .eq("character_index", charIndex)
    .maybeSingle();
  if (existing) {
    await supabase.from("chat_history").update({ messages, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("chat_history").insert({ user_id: userId, book_id: bookId, character_index: charIndex, messages });
  }
}

export async function syncChatFromSupabase(userId: string, bookId: string, charIndex: number) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data } = await supabase
    .from("chat_history")
    .select("messages")
    .eq("book_id", bookId)
    .eq("character_index", charIndex)
    .maybeSingle();
  if (data?.messages) {
    saveChatHistory(bookId, charIndex, data.messages as ChatMessage[]);
    return data.messages as ChatMessage[];
  }
  return null;
}

export async function syncAllChatFromSupabase(userId: string, bookIds: string[]) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data } = await supabase
    .from("chat_history")
    .select("*")
    .eq("user_id", userId);
  if (data) {
    for (const row of data) {
      if (row.messages) {
        saveChatHistory(row.book_id, row.character_index || 0, row.messages as ChatMessage[]);
      }
    }
  }
}
