'use client';

import { useState } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getGeneratedContent } from "@/lib/generated-content";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { Clapperboard, Download, Lightbulb } from "lucide-react";

const ASPECT_RATIOS = [
  { id: "16:9", label: "Landscape 16:9" },
  { id: "9:16", label: "Portrait 9:16" },
  { id: "1:1", label: "Square 1:1" },
  { id: "4:3", label: "Classic 4:3" },
  { id: "21:9", label: "Cinematic 21:9" },
];

const DURATIONS = [5, 10, 15];

export function VideoGenerator() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const generated = getGeneratedContent(bookId);
  const analysis = getManuscriptAnalysis(bookId);
  const existingVideo = generated?.items.find((i) => i.type === "video");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedScene, setSelectedScene] = useState<string>("");

  const sceneOptions = (analysis?.keyScenes || []).map((s) => `${s.title}: ${s.description} (${s.emotionalTone})`);
  const videoPrompts = existingVideo?.content ? existingVideo.content.split("\n").filter(Boolean) : [];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setVideoUrl(null);
    setError("");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Book: '${book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle}' by ${book?.authorName ?? APP_CONFIG.authorName}. Genre: ${analysis?.genre || book?.bookGenre || APP_CONFIG.bookGenre}. ${prompt}`,
          aspectRatio,
          duration,
        }),
      });
      const data = await res.json();
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        trackEvent("generate_video", book?.title ?? APP_CONFIG.bookTitle, { aspectRatio, duration });
      } else {
        setError(data.error || "Generation failed");
      }
    } catch {
      setError("Connection failed. Check your internet.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <p className="text-foreground text-sm">
        Generate AI book trailers and promotional videos from a text description.
        Powered by Seedance (ByteDance SD 2.0).
      </p>

      {videoPrompts.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          ✅ {videoPrompts.length} video prompt{videoPrompts.length > 1 ? "s" : ""} pre-generated from your manuscript
        </div>
      )}

      {(analysis?.keyScenes) && (
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Pick a Scene from Your Manuscript</label>
          <div className="grid grid-cols-1 gap-2">
            {(analysis?.keyScenes || []).slice(0, 4).map((scene, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedScene(scene.title);
                  setPrompt(`Cinematic scene: ${scene.description} — ${scene.emotionalTone} tone, featuring ${(scene.characters || []).join(", ")}`);
                }}
                className={`text-left bg-card border rounded-lg p-3 text-sm transition-all ${selectedScene === scene.title ? "border-accent ring-1 ring-accent" : "border-accent-dim hover:border-accent"}`}
              >
                <span className="font-medium text-foreground">{scene.title}</span>
                <span className="text-muted block text-xs mt-0.5">{scene.description}</span>
                <span className="text-xs text-accent mt-0.5 block">{scene.emotionalTone}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {videoPrompts.length > 0 && !selectedScene && (
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Pre-Generated Video Prompts</label>
          <div className="space-y-2">
            {videoPrompts.map((vp, i) => (
              <button
                key={i}
                onClick={() => setPrompt(vp.replace(/^[\s#*]+/, ""))}
                className="w-full text-left bg-card border border-accent-dim rounded-lg p-3 text-sm text-foreground hover:border-accent transition-colors"
              >
                {vp}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm text-muted font-medium">Video Description</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={analysis?.keyScenes?.[0]?.description || "Describe the scene... e.g. A cinematic shot of a mysterious castle at twilight, fog rolling in, dramatic music"}
          rows={3}
          className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Aspect Ratio</label>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                onClick={() => setAspectRatio(ar.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  aspectRatio === ar.id
                    ? "bg-accent text-white"
                    : "bg-card border border-accent-dim text-muted hover:text-accent"
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Duration</label>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  duration === d
                    ? "bg-accent text-white"
                    : "bg-card border border-accent-dim text-muted hover:text-accent"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="bg-accent text-white font-semibold rounded-lg px-6 py-2.5 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? "⏳ Generating video (this takes ~1-2 min)..." : <><Clapperboard className="w-4 h-4 inline-block mr-1.5" />Generate Video</>}
      </button>

      {error && (
        <div className="bg-card border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {videoUrl && (
        <div className="space-y-4">
          <label className="text-sm text-muted font-medium">Preview</label>
          <video
            src={videoUrl}
            controls
            className="w-full max-w-2xl rounded-xl shadow-2xl"
            style={{ aspectRatio }}
          />
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent text-white font-semibold rounded-lg px-4 py-2 transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            <Download className="w-4 h-4 inline-block mr-1.5" />Download Video
          </a>
        </div>
      )}

      <div className="bg-card border border-accent-dim rounded-xl p-4 text-sm text-foreground">
        <Lightbulb className="w-4 h-4 inline-block mr-1.5 text-accent" /> <strong className="text-accent">Tip:</strong> Use cinematic descriptions for best results.
        Mention lighting, camera movement, and mood.
      </div>
    </div>
  );
}
