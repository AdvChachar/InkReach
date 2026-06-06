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

export function clearGeneratedContent(bookId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_PREFIX}${bookId}`);
}
