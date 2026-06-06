'use client';

import { APP_CONFIG } from "@/config/client";
import { useTheme } from "@/context/theme-context";
import { useBook } from "@/context/book-context";
import { useState } from "react";

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const { books, activeBook, activeBookId, switchBook, addNewBook, updateCurrentBook, deleteBook } = useBook();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("inkreach_"));
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <aside className="w-72 bg-card border-r border-accent-dim p-6 flex flex-col gap-5 h-screen sticky top-0 overflow-y-auto shrink-0">
      <div className="flex flex-col items-center gap-1 mb-1">
        <img src="/inkreach-icon.png" alt="InkReach" className="w-12 h-12 rounded" />
        <span className="text-base font-bold tracking-tight" style={{ color: APP_CONFIG.accentColor }}>
          InkReach<span className="text-[10px] uppercase tracking-widest text-muted font-medium ml-0.5">™</span>
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted font-medium uppercase tracking-wider">Active Book</label>
        {books.length > 0 ? (
          <select
            value={activeBookId || ""}
            onChange={(e) => switchBook(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-muted">No books yet</p>
        )}
        <button
          onClick={() => addNewBook()}
          className="text-xs text-accent hover:underline"
        >
          + Add Book (clone defaults)
        </button>
      </div>

      {activeBook && (
        <>
          {activeBook.bookCoverUrl && activeBook.bookCoverUrl !== APP_CONFIG.bookCoverUrl && (
            <div className="relative">
              <img
                src={activeBook.bookCoverUrl}
                alt={activeBook.title}
                className="w-full rounded-lg"
              />
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-accent">{activeBook.title}</h2>
            <p className="text-sm text-foreground">by {activeBook.authorName}</p>
          </div>

          <hr className="border-accent-dim" />

          <div className="text-sm text-foreground space-y-2">
            <p className="text-muted font-medium">AI Ready</p>
            <p className="text-xs text-foreground">AI-powered content generation for {activeBook.title}</p>
          </div>

          <button
            onClick={() => { window.dispatchEvent(new CustomEvent("inkreach-show-wizard")); }}
            className="w-full bg-gradient-to-r from-accent to-purple-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            📄 Upload New Manuscript
          </button>

          <button
            onClick={() => { if (confirm(`Delete "${activeBook.title}" and all its generated content?`)) { deleteBook(activeBookId!); } }}
            className="w-full text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded-lg px-4 py-2 text-xs transition-colors"
          >
            🗑 Delete This Book
          </button>
        </>
      )}

      {!activeBook && (
        <>
          <hr className="border-accent-dim" />
          <div className="text-sm text-foreground space-y-2">
            <p className="text-muted font-medium">AI Ready</p>
            <p className="text-xs text-foreground">AI-powered content generation</p>
          </div>
        </>
      )}

      <hr className="border-accent-dim" />

      {showClearConfirm ? (
        <div className="space-y-2">
          <p className="text-xs text-red-400 text-center">Clear all data? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleClearAll} className="flex-1 bg-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-500/30 transition-colors">Yes, Clear</button>
            <button onClick={() => setShowClearConfirm(false)} className="flex-1 bg-accent-dim text-muted rounded-lg px-3 py-1.5 text-xs font-medium hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowClearConfirm(true)} className="w-full text-red-400/60 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-4 py-2 text-xs transition-colors">
          🗑 Clear All Data
        </button>
      )}

      <hr className="border-accent-dim mt-auto" />

      <button
        onClick={toggle}
        className="flex items-center justify-center gap-2 w-full bg-accent/10 hover:bg-accent/20 text-accent font-medium rounded-lg px-4 py-2.5 transition-all text-sm border border-accent-dim"
      >
        {theme === "dark" ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
            Light Mode
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Dark Mode
          </>
        )}
      </button>

      <p className="text-xs text-foreground text-center">
        Powered by <span className="text-muted">Softlancer</span>
      </p>
    </aside>
  );
}
