'use client';

import { useRef, useState, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { Download } from "lucide-react";

type ViewAngle = "front" | "angled-right" | "angled-left" | "open";

const VIEW_LABELS: Record<ViewAngle, string> = {
  "front": "Front View",
  "angled-right": "Angled Right",
  "angled-left": "Angled Left",
  "open": "Open Book",
};

const COLORS = [
  { label: "Royal Purple", bg: "#2D1B69", spine: "#1A0F3E" },
  { label: "Crimson Red", bg: "#6B1D1D", spine: "#3D0F0F" },
  { label: "Midnight Blue", bg: "#1B2D69", spine: "#0F1A3E" },
  { label: "Forest Green", bg: "#1D4A2A", spine: "#0F2E1A" },
  { label: "Charcoal", bg: "#2D2D2D", spine: "#1A1A1A" },
  { label: "Warm Gold", bg: "#6B5A1D", spine: "#3D340F" },
];

export function BookMockup() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const analysis = getManuscriptAnalysis(bookId);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [angle, setAngle] = useState<ViewAngle>("angled-right");
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [bookTitle, setBookTitle] = useState(book?.title ?? analysis?.title ?? "");
  const [authorName, setAuthorName] = useState(book?.authorName ?? analysis?.author ?? "");
  const [downloading, setDownloading] = useState(false);

  const [aiPrompt, setAiPrompt] = useState(analysis?.coverDescription || analysis?.settingDescriptions?.[0] || "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCoverSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(previewRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "book-mockup.png";
      link.href = dataUrl;
      link.click();
    } catch {
      console.error("Download failed");
    }
    setDownloading(false);
  }, []);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiImage(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.image) {
        const dataUrl = `data:image/png;base64,${data.image}`;
        setAiImage(dataUrl);
        trackEvent("generate_image", book?.title ?? "");
      } else if (data.content) {
        alert("AI responded with text instead of an image. Try a more visual prompt.");
      } else {
        alert(data.error || "Generation failed");
      }
    } catch {
      alert("Connection failed. Check your internet.");
    }
    setAiLoading(false);
  };

  const useAiImageAsCover = () => {
    if (aiImage) setCoverSrc(aiImage);
  };

  const spineColor = bgColor.spine;
  const pageColor = "#FFF8E7";

  return (
    <div className="space-y-6">
      <p className="text-foreground text-sm">
        Upload a book cover or generate one with AI, then create a 3D mockup for social media and ads.
      </p>

      {analysis?.coverDescription && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          ✅ AI prompt pre-filled from your manuscript description
        </div>
      )}

      <div className="bg-card border border-accent-dim rounded-xl p-5 space-y-3">
        <label className="text-sm text-muted font-medium">AI Generate Book Cover / Scene</label>
        <div className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={analysis?.coverDescription || "e.g. A dark fantasy book cover with a glowing castle and a hooded figure..."}
            className="flex-1 bg-dark text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAiGenerate(); }}
          />
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            className="bg-accent text-white font-semibold rounded-lg px-4 py-2 text-sm transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 whitespace-nowrap"
          >
            {aiLoading ? "⏳ Generating..." : "✨ Generate"}
          </button>
        </div>

        {analysis?.settingDescriptions && analysis.settingDescriptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analysis.settingDescriptions.slice(0, 3).map((desc, i) => (
              <button
                key={i}
                onClick={() => setAiPrompt(desc)}
                className="text-xs bg-accent/10 text-accent rounded-full px-2 py-1 hover:bg-accent/20 transition-colors"
              >
                Use: {desc.slice(0, 40)}...
              </button>
            ))}
          </div>
        )}

        {aiImage && (
          <div className="flex items-center gap-4 p-3 bg-dark rounded-lg">
            <img src={aiImage} alt="AI generated" className="h-24 w-auto rounded shadow object-cover" />
            <div className="space-y-2">
              <button
                onClick={useAiImageAsCover}
                className="bg-accent/20 text-accent text-sm font-medium rounded-lg px-3 py-1.5 hover:bg-accent/30 transition-colors"
              >
                Use as Cover for 3D Mockup
              </button>
              <p className="text-xs text-foreground">Generated by Gemini</p>
            </div>
          </div>
        )}
      </div>

      <hr className="border-accent-dim" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Book Cover</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-accent-dim rounded-xl p-6 text-center cursor-pointer hover:border-accent transition-colors"
          >
            {coverSrc ? (
              <img src={coverSrc} alt="Cover" className="max-h-40 mx-auto rounded shadow-lg" />
            ) : (
              <p className="text-muted text-sm">Click to upload cover image</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Background</label>
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.label}
                onClick={() => setBgColor(c)}
                className={`h-10 rounded-lg border-2 transition-all ${
                  bgColor.label === c.label ? "border-accent scale-105" : "border-transparent"
                }`}
                style={{ backgroundColor: c.bg }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Book Title (optional)</label>
          <input
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Author Name (optional)</label>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted font-medium">View Angle</label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(VIEW_LABELS) as [ViewAngle, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAngle(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                angle === key
                  ? "bg-accent text-white"
                  : "bg-card border border-accent-dim text-muted hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {coverSrc && (
        <div className="space-y-4">
          <div
            ref={previewRef}
            className="flex items-center justify-center rounded-xl overflow-x-auto max-w-full min-h-[320px]"
            style={{ backgroundColor: bgColor.bg }}
          >
            {angle === "front" && (
              <div className="relative" style={{ width: 200, height: 300 }}>
                <div
                  className="absolute inset-0 rounded shadow-2xl"
                  style={{
                    backgroundImage: `url(${coverSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                />
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 rounded-l"
                  style={{ backgroundColor: spineColor }}
                />
              </div>
            )}

            {angle === "angled-right" && (
              <div
                className="relative"
                style={{ width: 200, height: 300, perspective: 1000 }}
              >
                <div
                  className="absolute inset-0 rounded shadow-2xl"
                  style={{
                    backgroundImage: `url(${coverSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: "rotateY(-25deg) rotateX(5deg)",
                    transformStyle: "preserve-3d",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    borderRadius: "3px 8px 8px 3px",
                  }}
                />
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-l"
                  style={{
                    width: 8,
                    backgroundColor: spineColor,
                    transform: "rotateY(-25deg) rotateX(5deg)",
                    transformStyle: "preserve-3d",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            )}

            {angle === "angled-left" && (
              <div
                className="relative"
                style={{ width: 200, height: 300, perspective: 1000 }}
              >
                <div
                  className="absolute inset-0 rounded shadow-2xl"
                  style={{
                    backgroundImage: `url(${coverSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: "rotateY(25deg) rotateX(5deg)",
                    transformStyle: "preserve-3d",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    borderRadius: "8px 3px 3px 8px",
                  }}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 rounded-r"
                  style={{
                    width: 8,
                    backgroundColor: spineColor,
                    transform: "rotateY(25deg) rotateX(5deg)",
                    transformStyle: "preserve-3d",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            )}

            {angle === "open" && (
              <div
                className="relative flex"
                style={{ width: 350, height: 260, perspective: 1200 }}
              >
                <div
                  className="h-full rounded-l shadow-xl"
                  style={{
                    width: "48%",
                    backgroundImage: `url(${coverSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "left center",
                    transform: "rotateY(-35deg)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "right center",
                    borderRadius: "3px 0 0 3px",
                    boxShadow: "-5px 5px 20px rgba(0,0,0,0.4)",
                  }}
                />
                <div
                  className="h-full rounded-r shadow-xl"
                  style={{
                    width: "48%",
                    backgroundColor: pageColor,
                    transform: "rotateY(35deg)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "left center",
                    borderRadius: "0 3px 3px 0",
                    boxShadow: "5px 5px 20px rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 12,
                  }}
                >
                  <div className="text-center" style={{ color: "#2D1B69" }}>
                    <p className="text-sm font-bold leading-tight">{bookTitle || "Book Title"}</p>
                    <p className="text-xs mt-1 opacity-60">{authorName || "Author Name"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-accent text-white font-semibold rounded-lg px-6 py-2.5 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40"
          >
            {downloading ? "⏳ Downloading..." : <><Download className="w-4 h-4 inline-block mr-1.5" />Download Mockup PNG</>}
          </button>
        </div>
      )}

      {!coverSrc && !aiImage && (
        <div className="bg-card border border-accent-dim rounded-xl p-6 text-center text-sm text-foreground">
          Upload a cover image or generate one with AI above, then customize the 3D mockup.
        </div>
      )}
    </div>
  );
}
