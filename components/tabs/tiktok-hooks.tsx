'use client';

import { useState, useRef, useEffect } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getGeneratedContent } from "@/lib/generated-content";
import { getManuscriptAnalysis } from "@/lib/manuscript";

const HOOK_EMOJIS = ["🔥", "💥", "⚡", "🎯", "✨", "🚀", "💡", "🎬"];

interface HookItem {
  index: number;
  content: string;
}

function parseHooks(text: string): HookItem[] {
  const parts = text.split(/🎬 CONCEPT \[\d+\]:/).filter(Boolean);
  if (parts.length === 0) {
    return [{ index: 1, content: text.trim() }];
  }
  return parts.map((p, i) => ({
    index: i + 1,
    content: `🎬 CONCEPT [${i + 1}]:${p.trim()}`,
  }));
}

export function TikTokHooks() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const generated = getGeneratedContent(bookId);
  const analysis = getManuscriptAnalysis(bookId);
  const existingHooks = generated?.items.find((i) => i.type === "hooks");
  const [genre, setGenre] = useState<string>(book?.bookGenre ?? analysis?.genre ?? APP_CONFIG.bookGenre);
  const [tropeScene, setTropeScene] = useState("");
  const [tone, setTone] = useState(analysis?.tone ?? "Mysterious");
  const [count, setCount] = useState(5);
  const [hooks, setHooks] = useState<HookItem[]>(existingHooks ? parseHooks(existingHooks.content) : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const sceneOptions = (analysis?.keyScenes || []).map((s) => `${s.title}: ${s.description}`);

  const handleGenerate = async () => {
    setLoading(true);
    setHooks([]);
    setError("");
    try {
      const res = await fetch("/api/generate-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: book?.title ?? APP_CONFIG.bookTitle,
          authorName: book?.authorName ?? APP_CONFIG.authorName,
          genre,
          tone,
          bookBlurb: book?.bookBlurb ?? APP_CONFIG.bookBlurb,
          count,
          tropeScene: tropeScene || (analysis?.tropes || []).slice(0, 3).join(", "),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`❌ ${data.error}`);
      } else {
        setHooks(parseHooks(data.content));
        trackEvent("generate_hooks", book?.title ?? APP_CONFIG.bookTitle, { count });
      }
    } catch {
      setError("⚠️ Connection failed. Check your internet and try again.");
    }
    setLoading(false);
  };

  const copyHook = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`${book?.title ?? APP_CONFIG.bookTitle} — TikTok Hooks`, 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated for ${book?.authorName ?? APP_CONFIG.authorName} • ${genre} • ${tone} tone`, 20, 28);
    let y = 38;
    for (const hook of hooks) {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Hook #${hook.index}`, 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30);
      const lines = doc.splitTextToSize(hook.content, 175);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 12;
    }
    doc.save("tiktok_hooks.pdf");
  };

  const downloadAll = () => {
    const text = hooks.map((h) => h.content).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tiktok_hooks.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <p className="text-foreground text-sm">
        Generate scroll-stopping TikTok and Instagram Reel concepts for your book.
      </p>

      {hooks.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          ✅ {hooks.length} hook{hooks.length > 1 ? "s" : ""} pre-generated from your manuscript
        </div>
      )}

      {sceneOptions.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Pick a Scene from Your Manuscript</label>
          <div className="grid grid-cols-1 gap-2">
            {sceneOptions.slice(0, 4).map((scene, i) => (
              <button
                key={i}
                onClick={() => setTropeScene(scene.split(":")[0])}
                className={`text-left bg-card border rounded-lg p-3 text-sm transition-all ${tropeScene === scene.split(":")[0] ? "border-accent ring-1 ring-accent" : "border-accent-dim hover:border-accent"}`}
              >
                <span className="font-medium text-foreground">{scene.split(":")[0]}</span>
                <span className="text-muted block text-xs mt-0.5">{scene.split(":").slice(1).join(":").trim()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Genre</label>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Tone</label>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted font-medium">Trope / Scene</label>
        <input
          value={tropeScene}
          onChange={(e) => setTropeScene(e.target.value)}
          placeholder={analysis?.tropes?.slice(0, 3).join(", ") || "e.g. The moment she realizes he's been protecting her all along"}
          className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted font-medium">Number of hooks: {count}</label>
        <input
          type="range"
          min={3}
          max={8}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-foreground">
          <span>3</span>
          <span>8</span>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-4 py-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </>
        ) : hooks.length > 0 ? "🔄 Regenerate Hooks" : "🚀 Generate Hooks"}
      </button>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-card border border-accent-dim rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-accent-dim/30 rounded w-1/4 mb-3" />
              <div className="h-3 bg-accent-dim/20 rounded w-full mb-2" />
              <div className="h-3 bg-accent-dim/20 rounded w-3/4 mb-2" />
              <div className="h-3 bg-accent-dim/20 rounded w-1/2" />
            </div>
          ))}
          <p className="text-center text-sm text-muted animate-pulse font-medium">
            Crafting your viral hooks...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-card border border-red-500/30 rounded-xl p-4 text-foreground text-sm">
          {error}
        </div>
      )}

      {hooks.length > 0 && !loading && (
        <div ref={outputRef} className="space-y-4">
          {hooks.map((hook) => (
            <div
              key={hook.index}
              className="bg-card border border-accent-dim rounded-xl p-5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{HOOK_EMOJIS[(hook.index - 1) % HOOK_EMOJIS.length]}</span>
                  <h3 className="text-accent font-semibold">Hook #{hook.index}</h3>
                </div>
                <button
                  onClick={() => copyHook(hook.content, hook.index)}
                  className="text-xs text-muted hover:text-accent transition-colors px-3 py-1 rounded-md border border-accent-dim hover:border-accent"
                >
                  {copiedIndex === hook.index ? "✅ Copied!" : "📋 Copy"}
                </button>
              </div>
              <div className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                {hook.content}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              onClick={downloadPDF}
              className="bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-5 py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download All as PDF
            </button>
            <button
              onClick={downloadAll}
              className="bg-card text-foreground font-medium rounded-lg px-5 py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg border border-accent-dim hover:border-accent inline-flex items-center gap-2 text-sm"
            >
              📄 Download as TXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
