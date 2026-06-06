'use client';

import { useRef, useState, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getGeneratedContent } from "@/lib/generated-content";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { OutputCard, DownloadButton } from "@/components/ui/output-card";
import {
  getScheduledPosts,
  addScheduledPost,
  updatePostStatus,
  removeScheduledPost,
  type ScheduledPost,
} from "@/lib/scheduler";

type Platform = "instagram-post" | "instagram-story" | "tiktok" | "twitter" | "facebook";

const PLATFORMS: { id: Platform; label: string; ratio: string; w: number; h: number }[] = [
  { id: "instagram-post", label: "Instagram Post", ratio: "1:1", w: 400, h: 400 },
  { id: "instagram-story", label: "Instagram Story", ratio: "9:16", w: 300, h: 533 },
  { id: "tiktok", label: "TikTok Video", ratio: "9:16", w: 300, h: 533 },
  { id: "twitter", label: "Twitter / X", ratio: "16:9", w: 500, h: 281 },
  { id: "facebook", label: "Facebook Post", ratio: "4:5", w: 400, h: 500 },
];

const STYLES = ["Engaging & Authentic", "Humorous & Relatable", "Mysterious & Teasery", "Bold & Inspirational"];

function parseSocialPosts(text: string): { platform: string; caption: string; visual: string }[] {
  const lines = text.split("\n").filter(Boolean);
  const posts: { platform: string; caption: string; visual: string }[] = [];
  let current: any = {};
  for (const line of lines) {
    if (line.match(/^## |^# |\*\*Platform|\*\*Post/) || line.includes("Instagram") || line.includes("Facebook") || line.includes("TikTok") || line.includes("Twitter")) {
      if (current.caption) posts.push(current);
      current = { platform: line.replace(/^[\s#*]+/, "").trim(), caption: "", visual: "" };
    } else if (line.match(/Caption|Visual|Concept|Image/i)) {
      const val = line.replace(/^[\s#*]*(Caption|Visual Concept|Visual|Image|Concept):?\s*/i, "").trim();
      if (line.match(/Caption/i)) current.caption = val;
      else current.visual = val;
    } else if (current.platform && !current.caption) {
      current.caption = line.replace(/^[\s#*]+/, "").trim();
    } else if (current.caption && !current.visual) {
      if (!current.visual) current.visual = "";
      current.visual += " " + line.replace(/^[\s#*]+/, "").trim();
    }
  }
  if (current.caption) posts.push(current);
  return posts;
}

export function SocialPosts() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const generated = getGeneratedContent(bookId);
  const analysis = getManuscriptAnalysis(bookId);
  const existingSocial = generated?.items.find((i) => i.type === "social");
  const preParsedPosts = existingSocial ? parseSocialPosts(existingSocial.content) : [];
  const previewRef = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<Platform>("instagram-post");
  const [postStyle, setPostStyle] = useState(STYLES[0]);
  const [caption, setCaption] = useState(preParsedPosts[0]?.caption || "");
  const [visualConcept, setVisualConcept] = useState(preParsedPosts[0]?.visual || "");
  const [aiOutput, setAiOutput] = useState(existingSocial?.content || "");
  const [loading, setLoading] = useState(false);
  const [selectedScene, setSelectedScene] = useState<string>("");

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    setScheduledPosts(getScheduledPosts());
  }, []);

  const current = PLATFORMS.find((p) => p.id === platform)!;
  const sceneOptions = (analysis?.keyScenes || []).map((s) => `${s.title}: ${s.description} (${s.emotionalTone})`);

  const loadPost = (post: typeof preParsedPosts[0]) => {
    setCaption(post.caption);
    setVisualConcept(post.visual);
    const plat = post.platform.toLowerCase();
    if (plat.includes("instagram post") || plat.includes("1:1")) setPlatform("instagram-post");
    else if (plat.includes("instagram story") || plat.includes("9:16")) setPlatform("instagram-story");
    else if (plat.includes("tiktok")) setPlatform("tiktok");
    else if (plat.includes("twitter") || plat.includes("x")) setPlatform("twitter");
    else if (plat.includes("facebook")) setPlatform("facebook");
  };

  const handleAiGenerate = async () => {
    setLoading(true);
    setAiOutput("");
    try {
      const res = await fetch("/api/generate-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle,
          authorName: book?.authorName ?? APP_CONFIG.authorName,
          genre: (analysis?.genre || book?.bookGenre) ?? APP_CONFIG.bookGenre,
          bookBlurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
          tropes: (analysis?.tropes || []).join(", "),
          scene: selectedScene,
          platform: current.label,
          postStyle,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setAiOutput(data.content);
        const captionMatch = data.content.match(/Caption:\s*(.+)/);
        const visualMatch = data.content.match(/Visual Concept:\s*(.+)/);
        if (captionMatch) setCaption(captionMatch[1]);
        if (visualMatch) setVisualConcept(visualMatch[1]);
        trackEvent("generate_social", book?.title ?? APP_CONFIG.bookTitle, { platform: current.label });
      } else {
        setAiOutput(`❌ ${data.error || "Generation failed"}`);
      }
    } catch {
      setAiOutput("⚠️ Connection failed. Check your internet.");
    }
    setLoading(false);
  };

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      const dataUrl = await toPng(previewRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `social-post-${platform}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      console.error("Download failed");
    }
  }, [platform]);

  const handleSchedule = () => {
    if (!caption || !scheduleDate || !scheduleTime) return;
    const scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
    const updated = addScheduledPost({
      platform: current.label,
      caption,
      visualConcept,
      scheduledAt,
    });
    setScheduledPosts(updated);
    setScheduleDate("");
    setScheduleTime("");
    trackEvent("post_scheduled", book?.title ?? APP_CONFIG.bookTitle, { platform: current.label });
  };

  const handleMarkPosted = (id: string) => {
    const updated = updatePostStatus(id, "posted");
    setScheduledPosts(updated);
  };

  const pending = scheduledPosts.filter((p) => p.status === "pending");
  const history = scheduledPosts.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      <p className="text-foreground text-sm">
        Create and preview social media posts for any platform. Use AI to generate copy or write your own.
      </p>

      {preParsedPosts.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          ✅ {preParsedPosts.length} post{preParsedPosts.length > 1 ? "s" : ""} pre-generated from your manuscript
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setShowQueue(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            !showQueue ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted"
          }`}
        >
          Create Post
        </button>
        <button
          onClick={() => setShowQueue(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            showQueue ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted"
          }`}
        >
          Scheduled ({pending.length})
        </button>
      </div>

      {showQueue ? (
        <div className="space-y-4">
          {pending.length === 0 && history.length === 0 && (
            <p className="text-muted text-sm">No scheduled posts yet.</p>
          )}

          {pending.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-accent">Upcoming</h3>
              {pending.map((post) => (
                <div key={post.id} className="bg-card border border-accent-dim rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{post.caption}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {post.platform} • {new Date(post.scheduledAt).toLocaleString()}
                      </p>
                      {post.visualConcept && (
                        <p className="text-xs text-muted italic mt-1">🎨 {post.visualConcept}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleMarkPosted(post.id)}
                        className="text-xs bg-accent text-white rounded px-2 py-1 hover:bg-accent/90"
                      >
                        Mark Posted
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(post.caption)}
                        className="text-xs bg-card border border-accent-dim text-muted rounded px-2 py-1 hover:text-accent"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => { const u = removeScheduledPost(post.id); setScheduledPosts(u); }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted">History</h3>
              {history.map((post) => (
                <div key={post.id} className="bg-card/50 border border-accent-dim rounded-lg p-3 opacity-70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{post.caption}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {post.platform} • {new Date(post.scheduledAt).toLocaleString()}
                        {post.postedAt && ` • Posted ${new Date(post.postedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${post.status === "posted" ? "text-green-400" : "text-red-400"}`}>
                      {post.status === "posted" ? "Posted" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {preParsedPosts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Pick a Pre-Generated Post</label>
              <div className="grid grid-cols-1 gap-2">
                {preParsedPosts.map((post, i) => (
                  <button
                    key={i}
                    onClick={() => loadPost(post)}
                    className={`text-left bg-card border rounded-lg p-3 transition-all ${caption === post.caption ? "border-accent ring-1 ring-accent" : "border-accent-dim hover:border-accent"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted uppercase">{post.platform}</span>
                      {caption === post.caption && <span className="text-xs text-accent">Selected</span>}
                    </div>
                    <p className="text-sm text-foreground mt-1 line-clamp-2">{post.caption}</p>
                    {post.visual && <p className="text-xs text-muted mt-0.5">🎨 {post.visual}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sceneOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Pick a Scene from Your Manuscript</label>
              <div className="grid grid-cols-1 gap-2">
                {sceneOptions.slice(0, 4).map((scene, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedScene(scene.split(":")[0])}
                    className={`text-left bg-card border rounded-lg p-3 text-sm transition-all ${selectedScene === scene.split(":")[0] ? "border-accent ring-1 ring-accent" : "border-accent-dim hover:border-accent"}`}
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
              <label className="text-sm text-muted font-medium">Post Style</label>
              <select
                value={postStyle}
                onChange={(e) => setPostStyle(e.target.value)}
                className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 flex items-end">
              <button
                onClick={handleAiGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-4 py-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
              >
                {loading ? "⏳ Generating..." : "🤖 AI Generate Post"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    platform === p.id
                      ? "bg-accent text-white"
                      : "bg-card border border-accent-dim text-muted hover:text-accent"
                  }`}
                >
                  {p.label} ({p.ratio})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Visual Concept (for reference)</label>
            <input
              value={visualConcept}
              onChange={(e) => setVisualConcept(e.target.value)}
              className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm text-muted font-medium">Preview</label>
            <div className="flex justify-center">
              <div
                ref={previewRef}
                className="relative overflow-hidden rounded-xl shadow-2xl"
                style={{
                  width: current.w,
                  height: current.h,
                  backgroundColor: "#0F0A1E",
                  border: "1px solid rgba(192, 132, 252, 0.2)",
                }}
              >
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                      {book?.title ?? APP_CONFIG.bookTitle}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      by {book?.authorName ?? APP_CONFIG.authorName}
                    </p>
                  </div>

                  <div className="flex-1 flex items-center justify-center px-2">
                    <p className="text-sm text-center leading-relaxed text-foreground line-clamp-6">
                      {caption || "Your post caption will appear here..."}
                    </p>
                  </div>

                  <div className="text-right">
                    {visualConcept && (
                      <p className="text-[9px] text-muted italic leading-tight">
                        🎨 {visualConcept}
                      </p>
                    )}
                    <p className="text-[8px] text-muted mt-1">
                      {current.label} • {current.ratio}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleDownload}
                disabled={!caption}
                className="bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-4 py-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
              >
                📥 Download {current.label} PNG
              </button>
            </div>
          </div>

          {caption && (
            <div className="border border-accent-dim rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-card">
                <p className="text-sm font-medium text-foreground mb-3">📅 Schedule This Post</p>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduleDate || !scheduleTime}
                    className="bg-accent text-white font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-40 hover:bg-accent/90 transition-colors"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          )}

          {aiOutput && (
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">AI Generated Content</label>
              <OutputCard>{aiOutput}</OutputCard>
              <DownloadButton content={aiOutput} filename={`social-posts-${platform}.txt`} label="📥 Download AI Content" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
