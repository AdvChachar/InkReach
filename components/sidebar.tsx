'use client';

import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { useState } from "react";
import { FileText, Trash2, AlertTriangle, LogIn, LogOut, RefreshCw } from "lucide-react";

export function Sidebar() {
  const { books, activeBook, activeBookId, switchBook, addNewBook, updateCurrentBook, deleteBook, user, signOut } = useBook();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    const { syncBooksToSupabase, syncBooksFromSupabase } = await import("@/lib/books");
    const { syncAnalysisToSupabase, syncAnalysisFromSupabase } = await import("@/lib/manuscript");
    const { syncGeneratedToSupabase, syncGeneratedFromSupabase } = await import("@/lib/generated-content");
    if (user) {
      await syncBooksToSupabase(user.id);
      await syncAnalysisToSupabase(user.id);
      await syncGeneratedToSupabase(user.id);
      await syncBooksFromSupabase(user.id);
      await syncAnalysisFromSupabase(user.id);
      await syncGeneratedFromSupabase(user.id);
      window.location.reload();
    } else {
      const { createClient } = await import("@/lib/supabase");
      const { data } = await createClient().auth.getUser();
      if (data?.user) {
        await syncBooksFromSupabase(data.user.id);
        await syncAnalysisFromSupabase(data.user.id);
        await syncGeneratedFromSupabase(data.user.id);
        window.location.reload();
      }
    }
    setSyncing(false);
  };

  const handleClearAll = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("inkreach_"));
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <aside className="w-72 bg-card border-r border-border-subtle p-6 flex flex-col gap-5 h-screen sticky top-0 overflow-y-auto shrink-0">
      <div className="flex items-center gap-3">
        <img src="/inkreach-icon.png" alt="InkReach" className="w-9 h-9 rounded-md" />
        <div>
          <span className="text-base font-bold text-foreground">InkReach</span>
          <span className="text-[10px] text-muted ml-1">™</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted font-medium uppercase tracking-wider">Active Book</label>
        {books.length > 0 ? (
          <select
            value={activeBookId || ""}
            onChange={(e) => switchBook(e.target.value)}
            className="w-full bg-card text-foreground border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-muted">No books yet</p>
        )}
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent("inkreach-show-wizard")); }}
          className="text-xs text-accent font-medium hover:text-accent/80 transition-colors"
        >
          + Add Book
        </button>
      </div>

      {activeBook && (
        <>
          {activeBook.bookCoverUrl && activeBook.bookCoverUrl !== APP_CONFIG.bookCoverUrl && (
            <div className="relative">
              <img
                src={activeBook.bookCoverUrl}
                alt={activeBook.title}
                className="w-full rounded-lg border border-border-subtle"
              />
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-foreground">{activeBook.title}</h2>
            <p className="text-sm text-muted">by {activeBook.authorName}</p>
          </div>

          <hr className="border-border-subtle" />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">AI Ready</p>
            <p className="text-xs text-muted">AI-powered content generation for {activeBook.title}</p>
          </div>

          <button
            onClick={() => { window.dispatchEvent(new CustomEvent("inkreach-show-wizard")); }}
            className="w-full bg-accent text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-all hover:bg-accent/90 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Upload New Manuscript
          </button>

          <button
            onClick={() => { if (confirm(`Delete "${activeBook.title}" and all its generated content?`)) { deleteBook(activeBookId!); } }}
            className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 text-red-500 font-medium border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 rounded-lg px-4 py-2 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete This Book
          </button>
        </>
      )}

      {!activeBook && (
        <>
          <hr className="border-border-subtle" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">AI Ready</p>
            <p className="text-xs text-muted">AI-powered content generation</p>
          </div>
        </>
      )}

      <hr className="border-border-subtle" />

      {showClearConfirm ? (
        <div className="space-y-2">
          <p className="text-xs text-red-400 text-center">Clear all data? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleClearAll} className="flex-1 bg-red-500/20 text-red-400 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-500/30 transition-colors">Yes, Clear</button>
            <button onClick={() => setShowClearConfirm(false)} className="flex-1 bg-card text-muted border border-border-subtle rounded-lg px-3 py-1.5 text-xs font-medium hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowClearConfirm(true)} className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 text-red-500 font-medium border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 rounded-lg px-4 py-2 text-xs transition-colors">
          <AlertTriangle className="w-3.5 h-3.5" />
          Clear All Data
        </button>
      )}

      <p className="text-xs text-muted text-center mt-auto">
        Powered by <span className="text-foreground font-medium">Softlancer</span>
      </p>
    </aside>
  );
}
