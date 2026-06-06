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
  type BookConfig,
} from "@/lib/books";

interface BookContextValue {
  books: BookConfig[];
  activeBook: BookConfig | null;
  activeBookId: string | null;
  switchBook: (id: string) => void;
  addNewBook: (overrides?: Partial<Omit<BookConfig, "id" | "createdAt">>) => void;
  updateCurrentBook: (updates: Partial<Omit<BookConfig, "id" | "createdAt">>) => void;
  deleteBook: (id: string) => void;
}

const BookContext = createContext<BookContextValue | null>(null);

export function BookProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<BookConfig[]>([]);
  const [activeBookId, setActiveBookIdState] = useState<string | null>(null);

  useEffect(() => {
    const existing = initDefaultBook();
    setBooks(existing);
    setActiveBookIdState(getActiveBookId());
  }, []);

  const activeBook = books.find((b) => b.id === activeBookId) || null;

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
    if (!activeBookId) return;
    const updated = updateBook(activeBookId, updates);
    setBooks(updated);
  }, [activeBookId]);

  const deleteBook = useCallback((id: string) => {
    const updated = removeBook(id);
    setBooks(updated);
    setActiveBookIdState(getActiveBookId());
  }, []);

  return (
    <BookContext.Provider value={{ books, activeBook, activeBookId, switchBook, addNewBook, updateCurrentBook, deleteBook }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBook must be used within BookProvider");
  return ctx;
}
