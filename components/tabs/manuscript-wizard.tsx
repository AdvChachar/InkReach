'use client';

import { useState, useRef, useEffect } from "react";
import { useBook } from "@/context/book-context";
import { saveManuscriptAnalysis, type ManuscriptAnalysis } from "@/lib/manuscript";
import { saveGeneratedContent, type GeneratedItem } from "@/lib/generated-content";
import { getBooks, removeBook, updateBook } from "@/lib/books";
import { APP_CONFIG } from "@/config/client";

type WizardStep = "upload" | "analyzing" | "review" | "generating" | "done";

const ANALYSIS_STEPS = [
  "Reading chapters...",
  "Identifying characters...",
  "Extracting key quotes...",
  "Analyzing themes & tropes...",
  "Mapping key scenes...",
  "Building your book profile...",
];

const GENERATION_STEPS = [
  { key: "hooks", label: "TikTok Hooks" },
  { key: "email", label: "Email Sequence" },
  { key: "pitch", label: "Influencer Pitches" },
  { key: "social", label: "Social Posts" },
  { key: "ad", label: "Ad Copy" },
  { key: "video", label: "Video Prompts" },
];

export function ManuscriptWizard({ onComplete }: { onComplete: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysis, setAnalysis] = useState<ManuscriptAnalysis | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const { addNewBook } = useBook();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) startUpload(f);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
  };

  const startUpload = async (f: File) => {
    setFile(f);
    setError("");

    const allowed = [".txt", ".pdf", ".docx"];
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Please upload a .txt, .pdf, or .docx file");
      return;
    }

    setStep("analyzing");
    setAnalysisStep(0);

    const formData = new FormData();
    formData.append("file", f);

    try {
      const res = await fetch("/api/upload-manuscript", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("upload"); return; }

      setRawText(data.text);
      setWordCount(data.wordCount);

      const stepInterval = setInterval(() => {
        setAnalysisStep((prev) => Math.min(prev + 1, ANALYSIS_STEPS.length - 1));
      }, 2000);

      const analyzeRes = await fetch("/api/analyze-manuscript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.text }),
      });

      clearInterval(stepInterval);
      setAnalysisStep(ANALYSIS_STEPS.length);

      const analyzeData = await analyzeRes.json();
      if (analyzeData.error) { setError(analyzeData.error); setStep("upload"); return; }

      const fullAnalysis: ManuscriptAnalysis = {
        ...analyzeData,
        rawText: data.text.slice(0, 5000),
      };

      setAnalysis(fullAnalysis);

      const bookName = fullAnalysis.title || f.name.replace(/\.[^/.]+$/, "");
      addNewBook({
        title: bookName,
        authorName: fullAnalysis.author || APP_CONFIG.authorName,
        bookCoverUrl: coverImage || APP_CONFIG.bookCoverUrl,
        bookGenre: fullAnalysis.genre || APP_CONFIG.bookGenre,
        bookBlurb: fullAnalysis.blurb || APP_CONFIG.bookBlurb,
        bookTropes: (fullAnalysis.tropes || []).join(", "),
        targetReader: fullAnalysis.targetReader || APP_CONFIG.targetReader,
        marketingTone: fullAnalysis.tone || APP_CONFIG.marketingTone,
        manuscriptStatus: "ready",
      });

      // Clean up any default template books (no manuscriptStatus) now that a real one exists
      const allBooks = getBooks();
      allBooks.forEach((b) => { if (!b.manuscriptStatus && b.id !== localStorage.getItem("inkreach_active_book")) removeBook(b.id); });

      const bookId = localStorage.getItem("inkreach_active_book");
      if (bookId) saveManuscriptAnalysis(bookId, fullAnalysis);

      await new Promise((r) => setTimeout(r, 500));
      setStep("review");
    } catch {
      setError("Upload failed. Check your internet and try again.");
      setStep("upload");
    }
  };

  const handleGenerateAll = async () => {
    if (!analysis) return;
    setStep("generating");
    setGenerationProgress(0);

    try {
      const res = await fetch("/api/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const data = await res.json();

      if (data.results) {
        const items: GeneratedItem[] = data.results.map((r: any) => ({
          type: r.type,
          label: GENERATION_STEPS.find((g) => g.key === r.type)?.label || r.type,
          content: r.content,
          generatedAt: new Date().toISOString(),
        }));

        const bookId = localStorage.getItem("inkreach_active_book");
        if (bookId) saveGeneratedContent(bookId, items);

        setGenerationProgress(GENERATION_STEPS.length);
        await new Promise((r) => setTimeout(r, 300));
        setStep("done");
      }
    } catch {
      setError("Generation failed. You can regenerate from each tab.");
      setGenerationProgress(GENERATION_STEPS.length);
      await new Promise((r) => setTimeout(r, 300));
      setStep("done");
    }
  };

  if (step === "upload") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card border border-accent-dim rounded-2xl p-10 max-w-lg w-full text-center space-y-6">
          <div className="text-5xl">📖</div>
          <h2 className="text-2xl font-bold text-foreground">Upload Your Manuscript</h2>
          <p className="text-sm text-muted">
            Drop your manuscript file and we&apos;ll analyze it to auto-generate all your marketing content — hooks, emails, pitches, social posts, ads, and video ideas.
          </p>

          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-accent-dim rounded-xl p-8 cursor-pointer hover:border-accent transition-colors space-y-3"
          >
            <div className="text-3xl">📄</div>
            <p className="text-sm text-foreground font-medium">Drop your file here or click to browse</p>
            <p className="text-xs text-muted">Supports .txt, .pdf, and .docx (max 10MB)</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" onChange={handleFilePick} className="hidden" />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <details className="text-left border border-accent-dim rounded-xl overflow-hidden">
            <summary className="px-4 py-3 text-sm text-muted cursor-pointer hover:text-accent transition-colors font-medium">
              🎨 Upload Book Cover (optional — for color scheme detection)
            </summary>
            <div className="px-4 py-3 border-t border-accent-dim space-y-2">
              <div
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-accent-dim rounded-lg p-4 text-center cursor-pointer hover:border-accent transition-colors"
              >
                {coverImage ? (
                  <img src={coverImage} alt="Book Cover" className="max-h-32 mx-auto rounded shadow-lg" />
                ) : (
                  <p className="text-muted text-sm">Click to upload cover image</p>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onload = (ev) => setCoverImage(ev.target?.result as string); r.readAsDataURL(f); }
              }} className="hidden" />
              {coverImage && (
                <button onClick={() => setCoverImage(null)} className="text-xs text-red-400 hover:underline">Remove</button>
              )}
            </div>
          </details>

          <p className="text-xs text-muted">
            Your manuscript stays on your device. Nothing is uploaded to any server permanently.
          </p>
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card border border-accent-dim rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <svg className="w-12 h-12 mx-auto text-accent animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <h2 className="text-xl font-bold text-foreground">Analyzing Your Manuscript</h2>
          {wordCount > 0 && <p className="text-sm text-muted">{wordCount.toLocaleString()} words detected</p>}

          <div className="space-y-3 text-left max-w-sm mx-auto">
            {ANALYSIS_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {i < analysisStep ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                ) : i === analysisStep ? (
                  <svg className="w-5 h-5 text-accent animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-accent-dim text-muted flex items-center justify-center text-xs font-bold">{i + 1}</div>
                )}
                <span className={`text-sm ${i <= analysisStep ? "text-foreground" : "text-muted"}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "review" && analysis) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">✅</div>
          <h2 className="text-2xl font-bold text-foreground">Analysis Complete</h2>
          <p className="text-sm text-muted">We extracted the following from your manuscript. You can edit anything before generating.</p>
        </div>

        <div className="bg-card border border-accent-dim rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted font-medium">Title</label>
              <p className="text-sm text-foreground font-medium">{analysis.title || "Detected from file"}</p>
            </div>
            <div>
              <label className="text-xs text-muted font-medium">Author</label>
              <p className="text-sm text-foreground">{analysis.author || "Detected from file"}</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted font-medium">Genre</label>
            <p className="text-sm text-foreground">{analysis.genre}</p>
          </div>

          <div>
            <label className="text-xs text-muted font-medium">Blurb</label>
            <p className="text-sm text-foreground">{analysis.blurb}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted font-medium">Themes</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {(analysis.themes || []).map((t, i) => (
                  <span key={i} className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted font-medium">Tropes</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {(analysis.tropes || []).map((t, i) => (
                  <span key={i} className="text-xs bg-purple-500/10 text-purple-400 rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-card/50 rounded-lg p-3">
              <p className="text-lg font-bold text-accent">{(analysis.characters || []).length}</p>
              <p className="text-xs text-muted">Characters</p>
            </div>
            <div className="bg-card/50 rounded-lg p-3">
              <p className="text-lg font-bold text-accent">{(analysis.keyQuotes || []).length}</p>
              <p className="text-xs text-muted">Key Quotes</p>
            </div>
            <div className="bg-card/50 rounded-lg p-3">
              <p className="text-lg font-bold text-accent">{(analysis.keyScenes || []).length}</p>
              <p className="text-xs text-muted">Key Scenes</p>
            </div>
          </div>

          {(analysis.characters || []).length > 0 && (
            <div>
              <label className="text-xs text-muted font-medium">Characters</label>
              <div className="space-y-2 mt-1">
                {analysis.characters.slice(0, 3).map((c, i) => (
                  <div key={i} className="bg-card/50 rounded-lg p-2 text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted"> — {c.role}</span>
                    <p className="text-xs text-muted mt-0.5">{c.personality}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerateAll}
          className="w-full bg-gradient-to-r from-accent to-purple-600 text-white font-bold rounded-xl px-6 py-4 text-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          🚀 Generate All Marketing Content
        </button>
        <p className="text-xs text-muted text-center">
          This will generate hooks, emails, pitches, social posts, ad copy, and video prompts from your manuscript.
        </p>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card border border-accent-dim rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <svg className="w-12 h-12 mx-auto text-accent animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <h2 className="text-xl font-bold text-foreground">Generating Your Content</h2>

          <div className="space-y-3 text-left max-w-sm mx-auto">
            {GENERATION_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-3">
                {i < generationProgress ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                ) : i === generationProgress ? (
                  <svg className="w-5 h-5 text-accent animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-accent-dim text-muted flex items-center justify-center text-xs font-bold">{i + 1}</div>
                )}
                <span className={`text-sm ${i <= generationProgress ? "text-foreground" : "text-muted"}`}>{s.label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted animate-pulse">{generationStatus || "This may take a minute..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card border border-accent-dim rounded-2xl p-10 max-w-md w-full text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-foreground">All Set!</h2>
        <p className="text-sm text-muted">
          Your manuscript has been analyzed and all marketing content has been pre-generated.
          You can now review, customize, and publish from each tab.
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {GENERATION_STEPS.map((s) => (
            <div key={s.key} className="bg-green-500/10 text-green-400 rounded-lg px-3 py-2">
              ✅ {s.label}
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="w-full bg-gradient-to-r from-accent to-purple-600 text-white font-bold rounded-xl px-6 py-3 text-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          🚀 Go to Dashboard
        </button>
      </div>
    </div>
  );
}
