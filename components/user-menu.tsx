"use client";

import { useState, useRef, useEffect } from "react";
import { useBook } from "@/context/book-context";
import { LogOut, RefreshCw, User } from "lucide-react";

export function UserMenu() {
  const { user, signOut } = useBook();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    const { syncBooksToSupabase, syncBooksFromSupabase } = await import("@/lib/books");
    const { syncAnalysisToSupabase, syncAnalysisFromSupabase } = await import("@/lib/manuscript");
    const { syncGeneratedToSupabase, syncGeneratedFromSupabase } = await import("@/lib/generated-content");
    await syncBooksToSupabase(user.id);
    await syncAnalysisToSupabase(user.id);
    await syncGeneratedToSupabase(user.id);
    await syncBooksFromSupabase(user.id);
    await syncAnalysisFromSupabase(user.id);
    await syncGeneratedFromSupabase(user.id);
    setSyncing(false);
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:bg-gray-100 dark:hover:bg-accent-dim p-1.5 pr-3 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#1dbf73] text-white flex items-center justify-center text-sm font-bold">
          {user.email?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-foreground max-sm:hidden">
          {user.email?.split("@")[0] || "User"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card border border-gray-200 dark:border-border-subtle rounded-xl shadow-xl py-1 z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-border-subtle">
            <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">{user.email}</p>
            <p className="text-xs text-gray-500 dark:text-muted">Logged in</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-muted hover:bg-gray-50 dark:hover:bg-accent-dim transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Data
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
