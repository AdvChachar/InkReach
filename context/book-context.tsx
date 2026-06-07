'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  getBooks,
  getActiveBook,
  getActiveBookId,
  setActiveBookId,
  addBook,
  updateBook,
  removeBook,
  initDefaultBook,
  syncBooksFromSupabase,
  syncBooksToSupabase,
  type BookConfig,
} from "@/lib/books";
import { syncAnalysisFromSupabase, syncAnalysisToSupabase } from "@/lib/manuscript";
import { syncGeneratedFromSupabase, syncGeneratedToSupabase } from "@/lib/generated-content";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface BookContextValue {
  books: BookConfig[];
  activeBook: BookConfig | null;
  activeBookId: string | null;
  switchBook: (id: string) => void;
  addNewBook: (overrides?: Partial<Omit<BookConfig, "id" | "createdAt">>) => void;
  updateCurrentBook: (updates: Partial<Omit<BookConfig, "id" | "createdAt">>) => void;
  deleteBook: (id: string) => void;
  user: { id: string; email?: string } | null;
  signOut: () => Promise<void>;
}

const BookContext = createContext<BookContextValue | null>(null);

export function BookProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<BookConfig[]>([]);
  const [activeBookIdState, setActiveBookIdState] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email });
        syncOnlyFromSupabase(data.user.id);
      } else {
        const existing = initDefaultBook();
        setBooks(existing);
        setActiveBookIdState(getActiveBookId());
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setBooks([]);
        setActiveBookIdState(null);
        localStorage.removeItem("inkreach_books");
        localStorage.removeItem("inkreach_active_book_id");
        localStorage.removeItem("inkreach_manuscript_analyses");
        localStorage.removeItem("inkreach_generated_content");
        window.location.href = "/login";
      } else if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        clearLocalStorage();
        syncOnlyFromSupabase(session.user.id).then(() => {
          router.refresh();
        });
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  function clearLocalStorage() {
    localStorage.removeItem("inkreach_books");
    localStorage.removeItem("inkreach_active_book_id");
    localStorage.removeItem("inkreach_manuscript_analyses");
    localStorage.removeItem("inkreach_generated_content");
  }

  async function syncOnlyFromSupabase(userId: string) {
    await syncBooksFromSupabase(userId);
    await syncAnalysisFromSupabase(userId);
    await syncGeneratedFromSupabase(userId);
    setBooks(getBooks());
    setActiveBookIdState(getActiveBookId());
  }

  const activeBook = books.find((b) => b.id === activeBookIdState) || null;

  const switchBook = useCallback((id: string) => {
    setActiveBookId(id);
    setActiveBookIdState(id);
  }, []);

  const addNewBook = useCallback((overrides?: Partial<Omit<BookConfig, "id" | "createdAt">>) => {
    const updated = addBook(overrides);
    setBooks(updated);
    setActiveBookIdState(getActiveBookId());
  }, []);

  const updateCurrentBook = useCallback((updates: Partial<Omit<BookConfig, "id" | "createdAt">>) => {
    if (!activeBookIdState) return;
    const updated = updateBook(activeBookIdState, updates);
    setBooks(updated);
  }, [activeBookIdState]);

  const deleteBook = useCallback((id: string) => {
    const updated = removeBook(id);
    setBooks(updated);
    setActiveBookIdState(getActiveBookId());
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  return (
    <BookContext.Provider value={{ books, activeBook, activeBookId: activeBookIdState, switchBook, addNewBook, updateCurrentBook, deleteBook, user, signOut }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBook must be used within BookProvider");
  return ctx;
}
