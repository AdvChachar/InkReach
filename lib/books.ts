import { APP_CONFIG } from "@/config/client";

export type ManuscriptStatus = "none" | "uploading" | "analyzing" | "ready";

export interface BookConfig {
  id: string;
  title: string;
  authorName: string;
  bookCoverUrl: string;
  bookBlurb: string;
  bookGenre: string;
  protagonistName: string;
  protagonistPersona: string;
  bookTropes: string;
  targetReader: string;
  marketingTone: string;
  createdAt: string;
  manuscriptStatus?: ManuscriptStatus;
}

const STORAGE_KEY = "inkreach_books";
const ACTIVE_KEY = "inkreach_active_book";

const defaults: Omit<BookConfig, "id" | "createdAt"> = {
  title: APP_CONFIG.bookTitle,
  authorName: APP_CONFIG.authorName,
  bookCoverUrl: APP_CONFIG.bookCoverUrl,
  bookBlurb: APP_CONFIG.bookBlurb,
  bookGenre: APP_CONFIG.bookGenre,
  protagonistName: APP_CONFIG.protagonistName,
  protagonistPersona: APP_CONFIG.protagonistPersona,
  bookTropes: APP_CONFIG.bookTropes,
  targetReader: APP_CONFIG.targetReader,
  marketingTone: APP_CONFIG.marketingTone,
};

export function getBooks(): BookConfig[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getActiveBookId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveBookId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function addBook(overrides: Partial<Omit<BookConfig, "id" | "createdAt">> = {}): BookConfig[] {
  const books = getBooks();
  const book: BookConfig = {
    id: crypto.randomUUID(),
    ...defaults,
    ...overrides,
    createdAt: new Date().toISOString(),
  };
  books.push(book);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  setActiveBookId(book.id);
  return books;
}

export function updateBook(id: string, updates: Partial<Omit<BookConfig, "id" | "createdAt">>): BookConfig[] {
  const books = getBooks().map((b) => (b.id === id ? { ...b, ...updates } : b));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  return books;
}

export function removeBook(id: string): BookConfig[] {
  let books = getBooks().filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  if (getActiveBookId() === id) {
    if (books.length > 0) setActiveBookId(books[0].id);
    else localStorage.removeItem(ACTIVE_KEY);
  }
  return books;
}

export function getActiveBook(): BookConfig | null {
  const id = getActiveBookId();
  if (!id) return null;
  return getBooks().find((b) => b.id === id) || null;
}

export function getEffectiveBookConfig(book?: BookConfig | null) {
  if (!book) return defaults;
  return book;
}

export function initDefaultBook(): BookConfig[] {
  const books = getBooks();
  if (books.length === 0) return [];
  if (!getActiveBookId()) setActiveBookId(books[0].id);
  return books;
}

export async function syncBooksToSupabase(userId: string) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const books = getBooks();
  for (const b of books) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("id", b.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("books").insert({
        id: b.id,
        user_id: userId,
        title: b.title,
        author_name: b.authorName,
        book_cover_url: b.bookCoverUrl,
        book_blurb: b.bookBlurb,
        book_genre: b.bookGenre,
        protagonist_name: b.protagonistName,
        protagonist_persona: b.protagonistPersona,
        book_tropes: b.bookTropes,
        target_reader: b.targetReader,
        marketing_tone: b.marketingTone,
        manuscript_status: b.manuscriptStatus || "none",
      });
    }
  }
}

export async function syncBooksFromSupabase(userId: string) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (data && data.length > 0) {
    const existing = getBooks();
    const existingIds = new Set(existing.map((b) => b.id));
    for (const row of data) {
      if (!existingIds.has(row.id)) {
        existing.push({
          id: row.id as string,
          title: (row.title as string) || defaults.title,
          authorName: (row.author_name as string) || defaults.authorName,
          bookCoverUrl: (row.book_cover_url as string) || defaults.bookCoverUrl,
          bookBlurb: (row.book_blurb as string) || defaults.bookBlurb,
          bookGenre: (row.book_genre as string) || defaults.bookGenre,
          protagonistName: (row.protagonist_name as string) || defaults.protagonistName,
          protagonistPersona: (row.protagonist_persona as string) || defaults.protagonistPersona,
          bookTropes: (row.book_tropes as string) || defaults.bookTropes,
          targetReader: (row.target_reader as string) || defaults.targetReader,
          marketingTone: (row.marketing_tone as string) || defaults.marketingTone,
          createdAt: (row.created_at as string) || new Date().toISOString(),
          manuscriptStatus: (row.manuscript_status as ManuscriptStatus) || undefined,
        });
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    if (!getActiveBookId() && existing.length > 0) setActiveBookId(existing[0].id);
  }
}
