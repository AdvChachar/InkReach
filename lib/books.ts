import { APP_CONFIG } from "@/config/client";
import type { ManuscriptAnalysis } from "./manuscript";

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
  if (books.length === 0) return addBook();
  if (!getActiveBookId()) setActiveBookId(books[0].id);
  return books;
}
