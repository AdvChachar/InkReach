'use client';

import { useState, useEffect, useRef } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getGeneratedContent } from "@/lib/generated-content";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { getCampaign, saveCampaign, toggleTask, getCalendarEntries, getPhaseProgress, getOverallProgress, type Campaign, type CampaignPhase } from "@/lib/campaign";
import { getLandingConfig, saveLandingConfig, buildLandingPageHTML, buildEmbedCode, type LandingPageConfig } from "@/lib/landing-page";
import { getReviewers, saveReviewers, addReviewer, updateReviewerStatus, removeReviewer, getReviewStats, parseARCCSV, type ARCReviewer } from "@/lib/reviews";
import { toast } from "sonner";

const PHASE_LABELS: Record<CampaignPhase, string> = {
  "pre-launch": "Pre-Launch (T-60 to T-1)",
  launch: "Launch Week",
  "post-launch": "Post-Launch (T+7 to T+30)",
};

const PHASE_ORDER: CampaignPhase[] = ["pre-launch", "launch", "post-launch"];

const CONTENT_TYPES = [
  { key: "hooks", label: "TikTok Hooks", color: "text-blue-400" },
  { key: "email", label: "Email Sequence", color: "text-green-400" },
  { key: "pitch", label: "Influencer Pitches", color: "text-accent" },
  { key: "social", label: "Social Posts", color: "text-yellow-400" },
  { key: "ad", label: "Ad Copy", color: "text-orange-400" },
  { key: "video", label: "Video Prompts", color: "text-pink-400" },
];

export function CampaignDashboard() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const generated = getGeneratedContent(bookId);
  const analysis = getManuscriptAnalysis(bookId);
  const [campaign, setCampaign] = useState<Campaign>(() => getCampaign());
  const [bookTitle, setBookTitle] = useState((campaign.bookTitle || book?.title || analysis?.title) ?? APP_CONFIG.bookTitle);
  const [launchDate, setLaunchDate] = useState(campaign.launchDate);
  const [view, setView] = useState<"tasks" | "calendar">("tasks");
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState<string[]>([]);

  const [showLanding, setShowLanding] = useState(false);
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>(() => getLandingConfig() || {
    bookTitle: book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle,
    authorName: book?.authorName ?? analysis?.author ?? APP_CONFIG.authorName,
    bookBlurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
    bookCoverUrl: book?.bookCoverUrl ?? APP_CONFIG.bookCoverUrl,
    accentColor: APP_CONFIG.accentColor,
    launchDate: "",
    showCountdown: true,
    showEmailSignup: true,
    emailPlaceholder: "your@email.com",
    ctaText: "Get Updates",
    backgroundColor: "#f8f6f3",
  });
  const [landingPreview, setLandingPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showARC, setShowARC] = useState(false);
  const [reviewers, setReviewers] = useState<ARCReviewer[]>([]);
  const [newARCEmail, setNewARCEmail] = useState("");
  const [newARCName, setNewARCName] = useState("");
  const [newARCFormat, setNewARCFormat] = useState<ARCReviewer["format"]>("ebook");
  const arcFileRef = useRef<HTMLInputElement>(null);
  const [sendingARC, setSendingARC] = useState(false);

  const generatedItems = generated?.items || [];

  useEffect(() => {
    const c = { ...campaign, bookTitle, launchDate };
    saveCampaign(c);
  }, [bookTitle, launchDate]);

  useEffect(() => {
    setReviewers(getReviewers());
  }, []);

  useEffect(() => {
    saveLandingConfig(landingConfig);
  }, [landingConfig]);
  const updateLanding = (partial: Partial<LandingPageConfig>) => setLandingConfig((prev) => ({ ...prev, ...partial }));

  const handleToggleTask = (taskId: string) => {
    const updated = toggleTask(campaign.id, taskId);
    setCampaign({ ...updated });
    const task = updated.tasks.find((t) => t.id === taskId);
    if (task?.completed) trackEvent("campaign_task_toggled", bookTitle, { task: task.title });
  };

  const overall = getOverallProgress(campaign);
  const preLaunch = getPhaseProgress(campaign, "pre-launch");
  const launch = getPhaseProgress(campaign, "launch");
  const postLaunch = getPhaseProgress(campaign, "post-launch");
  const entries = getCalendarEntries(campaign);

  const handleGenerateAll = async () => {
    setGenerating(true);
    setGenLog([]);
    const log: string[] = [];

    const gen = async (url: string, body: object) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.error) return { success: false, content: data.error };
        return { success: true, content: data.content };
      } catch {
        return { success: false, content: "Request failed" };
      }
    };

    log.push("Generating TikTok hooks...");
    setGenLog([...log]);
    const hooks = await gen("/api/generate-hooks", {
      genre: (analysis?.genre || book?.bookGenre) ?? APP_CONFIG.bookGenre,
      tone: (analysis?.tone || book?.marketingTone) ?? APP_CONFIG.marketingTone,
      tropeScene: ((analysis?.tropes || []).join(", ") || book?.bookTropes) ?? APP_CONFIG.bookTropes,
      count: 5,
    });
    log.push(hooks.success ? "✅ Hooks generated" : `❌ Hooks: ${hooks.content}`);
    setGenLog([...log]);

    log.push("Generating email sequence...");
    setGenLog([...log]);
    const email = await gen("/api/generate-email", {
      bookTitle,
      authorName: book?.authorName ?? analysis?.author ?? APP_CONFIG.authorName,
      launchDate,
      readerAvatar: (analysis?.targetReader || book?.targetReader) ?? APP_CONFIG.targetReader,
      tropes: ((analysis?.tropes || []).join(", ") || book?.bookTropes) ?? APP_CONFIG.bookTropes,
      bookBlurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
    });
    log.push(email.success ? "✅ Email sequence generated" : `❌ Email: ${email.content}`);
    setGenLog([...log]);

    log.push("Generating influencer pitches...");
    setGenLog([...log]);
    const pitch = await gen("/api/generate-pitch", {
      bookTitle,
      bookGenre: (analysis?.genre || book?.bookGenre) ?? APP_CONFIG.bookGenre,
      bookBlurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
      bookTropes: ((analysis?.tropes || []).join(", ") || book?.bookTropes) ?? APP_CONFIG.bookTropes,
      influencerName: "[Influencer Name]",
      influencerBio: (analysis?.targetReader || book?.targetReader || "Reader") + " on Email",
      platform: "Email",
      pitchType: "ARC Review Request (Free Copy)",
      isLarge: false,
    });
    log.push(pitch.success ? "✅ Pitches generated" : `❌ Pitch: ${pitch.content}`);
    setGenLog([...log]);

    log.push("Generating social posts...");
    setGenLog([...log]);
    const social = await gen("/api/generate-social", {
      bookTitle,
      authorName: book?.authorName ?? analysis?.author ?? APP_CONFIG.authorName,
      bookBlurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
      bookGenre: (analysis?.genre || book?.bookGenre) ?? APP_CONFIG.bookGenre,
      bookTropes: ((analysis?.tropes || []).join(", ") || book?.bookTropes) ?? APP_CONFIG.bookTropes,
      scene: analysis?.keyScenes?.[0]?.title || "",
      platform: "Instagram Post 1:1",
      postStyle: "Engaging & Authentic",
    });
    log.push(social.success ? "✅ Social posts generated" : `❌ Social: ${social.content}`);
    setGenLog([...log]);

    setGenerating(false);
    toast.success("Batch generation complete!");
  };

  const handleAddARC = () => {
    if (!newARCEmail.includes("@")) return;
    const updated = addReviewer({
      email: newARCEmail,
      name: newARCName || newARCEmail.split("@")[0],
      format: newARCFormat,
      status: "pending",
      notes: "",
      dateAdded: new Date().toISOString(),
    });
    setReviewers(updated);
    setNewARCEmail("");
    setNewARCName("");
    toast.success("ARC reviewer added");
  };

  const handleARCCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseARCCSV(text);
      if (parsed.length === 0) { toast.error("No valid reviewers found"); return; }
      const list = getReviewers();
      for (const r of parsed) {
        if (!list.some((x) => x.email.toLowerCase() === r.email.toLowerCase())) {
          list.push({ ...r, status: "pending", notes: "", dateAdded: new Date().toISOString() });
        }
      }
      saveReviewers(list);
      setReviewers([...list]);
      toast.success(`${parsed.length} reviewers imported`);
    };
    reader.readAsText(file);
    if (arcFileRef.current) arcFileRef.current.value = "";
  };

  const handleSendARCReviewRequest = async (reviewer: ARCReviewer) => {
    setSendingARC(true);
    try {
      const html = `<p>Hi ${reviewer.name},</p><p>Thank you for agreeing to review <strong>${bookTitle}</strong>! Your ARC copy is ready.</p><p><a href="${window.location.origin}" style="background:${APP_CONFIG.accentColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Download ARC</a></p><p>After reading, please leave a review on <a href="https://amazon.com">Amazon</a> or <a href="https://goodreads.com">Goodreads</a>.</p><p>Happy reading!</p>`;
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reviewer.email,
          subject: `ARC Review Request: ${bookTitle}`,
          html,
          from: `${APP_CONFIG.emailSenderName} <${APP_CONFIG.emailSenderAddress}>`,
          campaign: `arc-${bookTitle.replace(/\s+/g, "-").toLowerCase()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = updateReviewerStatus(reviewer.email, "sent", { dateSent: new Date().toISOString() });
        setReviewers([...updated]);
        toast.success(`ARC request sent to ${reviewer.name}`);
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to send ARC request");
    }
    setSendingARC(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Launch Campaign Dashboard</h2>
        <p className="text-sm text-muted">Plan, generate, and track your entire book launch.</p>
      </div>

      {generatedItems.length > 0 && (
        <div className="bg-card border border-accent-dim rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">All Generated Content</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CONTENT_TYPES.map((ct) => {
              const has = generatedItems.some((i) => i.type === ct.key);
              return (
                <div key={ct.key} className={`rounded-lg p-3 text-sm border ${has ? "bg-green-500/10 border-green-500/30" : "bg-card border-accent-dim"}`}>
                  <span className={ct.color}>{ct.label}</span>
                  <span className="ml-2">{has ? "✅" : "⏳"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Book Title</label>
          <input
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Launch Date</label>
          <input
            type="date"
            value={launchDate}
            onChange={(e) => setLaunchDate(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {launchDate && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-accent-dim rounded-xl p-4">
              <p className="text-2xl font-bold text-accent">{overall.completed}/{overall.total}</p>
              <p className="text-xs text-muted">Overall Progress</p>
              <div className="w-full bg-accent-dim rounded-full h-1.5 mt-2">
                <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${overall.total ? (overall.completed / overall.total) * 100 : 0}%` }} />
              </div>
            </div>
            {([["pre-launch", preLaunch], ["launch", launch], ["post-launch", postLaunch]] as const).map(([phase, progress]) => (
              <div key={phase} className="bg-card border border-accent-dim rounded-xl p-4">
                <p className="text-lg font-bold text-foreground">{progress.completed}/{progress.total}</p>
                <p className="text-xs text-muted capitalize">{phase.replace("-", " ")}</p>
                <div className="w-full bg-accent-dim rounded-full h-1.5 mt-2">
                  <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setView("tasks")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === "tasks" ? "bg-accent text-white" : "bg-card text-muted border border-accent-dim hover:text-accent"
              }`}
            >
              ✅ Task List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === "calendar" ? "bg-accent text-white" : "bg-card text-muted border border-accent-dim hover:text-accent"
              }`}
            >
              Content Calendar
            </button>
          </div>

          {view === "tasks" ? (
            <div className="space-y-6">
              {PHASE_ORDER.map((phase) => {
                const phaseTasks = campaign.tasks.filter((t) => t.phase === phase);
                return (
                  <div key={phase}>
                    <h3 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wider">{PHASE_LABELS[phase]}</h3>
                    <div className="space-y-2">
                      {phaseTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex items-start gap-3 bg-card border border-accent-dim rounded-xl px-4 py-3 cursor-pointer hover:bg-accent/5 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleTask(task.id)}
                            className="mt-0.5 accent-accent"
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${task.completed ? "line-through text-muted" : "text-foreground"}`}>
                              {task.title}
                            </p>
                            <p className="text-xs text-muted">{task.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.daysFromLaunch < 0 ? "bg-blue-500/10 text-blue-400" :
                            task.daysFromLaunch === 0 ? "bg-green-500/10 text-green-400" :
                            "bg-accent/10 text-accent"
                          }`}>
                            {task.daysFromLaunch < 0 ? `T${task.daysFromLaunch}` :
                             task.daysFromLaunch === 0 ? "Launch Day" :
                             `T+${task.daysFromLaunch}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-accent-dim rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-accent-dim font-medium text-foreground text-sm">Content Calendar</div>
              <div className="divide-y divide-accent-dim max-h-96 overflow-y-auto">
                {entries.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted text-sm">Set a launch date to see your calendar.</div>
                ) : (
                  entries.map((entry) => {
                    const date = new Date(entry.date + "T00:00:00");
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = date < today;
                    const isToday = date.getTime() === today.getTime();
                    return (
                      <div key={entry.date} className={`px-5 py-3 ${isPast ? "opacity-50" : ""} ${isToday ? "bg-accent/5" : ""}`}>
                        <p className="text-xs font-medium text-muted mb-1">
                          {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {isToday && <span className="ml-2 text-accent">● Today</span>}
                        </p>
                        {entry.tasks.map((ct) => {
                          const task = campaign.tasks.find((t) => t.id === ct.taskId);
                          if (!task) return null;
                          return (
                            <p key={ct.taskId} className={`text-sm ${task.completed ? "line-through text-muted" : "text-foreground"}`}>
                              {task.completed ? "✅" : "○"} {task.title}
                            </p>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-accent-dim rounded-xl p-5">
            <h3 className="font-medium text-foreground mb-3">⚡ Generate All Campaign Content</h3>
            <p className="text-sm text-muted mb-4">Generate hooks, email sequence, pitches, and social posts in one click.</p>
            <button
              onClick={handleGenerateAll}
              disabled={generating}
              className="bg-accent text-white font-semibold rounded-lg px-5 py-2.5 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? "⏳ Generating..." : "⚡ Generate All Content"}
            </button>
            {genLog.length > 0 && (
              <div className="mt-4 space-y-1">
                {genLog.map((line, i) => (
                  <p key={i} className="text-xs text-foreground">{line}</p>
                ))}
              </div>
            )}
          </div>

          <div className="border border-accent-dim rounded-xl overflow-hidden">
            <button
              onClick={() => setShowLanding(!showLanding)}
              className="w-full px-5 py-3 flex items-center justify-between bg-card hover:bg-accent/5 transition-colors"
            >
              <span className="font-medium text-foreground">Landing Page Builder</span>
              <span className="text-muted text-sm">{showLanding ? "▲" : "▼"}</span>
            </button>
            {showLanding && (
              <div className="px-5 py-4 space-y-4 border-t border-accent-dim">
                <p className="text-sm text-muted">Create a standalone pre-launch landing page to collect emails and build hype.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted">Book Cover URL</label>
                    <input value={landingConfig.bookCoverUrl} onChange={(e) => updateLanding({ bookCoverUrl: e.target.value })} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted">Accent Color</label>
                    <input type="color" value={landingConfig.accentColor} onChange={(e) => updateLanding({ accentColor: e.target.value })} className="w-full h-9 rounded-lg cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted">Background Color</label>
                    <input type="color" value={landingConfig.backgroundColor} onChange={(e) => updateLanding({ backgroundColor: e.target.value })} className="w-full h-9 rounded-lg cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted">Button Text</label>
                    <input value={landingConfig.ctaText} onChange={(e) => updateLanding({ ctaText: e.target.value })} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted">Email Placeholder</label>
                    <input value={landingConfig.emailPlaceholder} onChange={(e) => updateLanding({ emailPlaceholder: e.target.value })} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={landingConfig.showCountdown} onChange={(e) => updateLanding({ showCountdown: e.target.checked })} className="accent-accent" /> Countdown
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={landingConfig.showEmailSignup} onChange={(e) => updateLanding({ showEmailSignup: e.target.checked })} className="accent-accent" /> Email Signup
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setLandingPreview(!landingPreview)} className="bg-card border border-accent text-accent font-medium rounded-lg px-4 py-2 text-sm hover:bg-accent/5 transition-colors">
                    {landingPreview ? "Hide Preview" : "Preview"}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(buildLandingPageHTML(landingConfig)); toast.success("HTML copied!"); }} className="bg-card border border-accent text-accent font-medium rounded-lg px-4 py-2 text-sm hover:bg-accent/5 transition-colors">
                    Copy HTML
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(buildEmbedCode(landingConfig)); toast.success("Embed code copied!"); }} className="bg-card border border-accent text-accent font-medium rounded-lg px-4 py-2 text-sm hover:bg-accent/5 transition-colors">
                    Copy Embed Code
                  </button>
                </div>
                {landingPreview && (
                  <div className="border border-accent-dim rounded-lg overflow-hidden">
                    <iframe srcDoc={buildLandingPageHTML(landingConfig)} className="w-full" style={{ height: 500, background: "#fff" }} title="Landing Preview" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border border-accent-dim rounded-xl overflow-hidden">
            <button
              onClick={() => setShowARC(!showARC)}
              className="w-full px-5 py-3 flex items-center justify-between bg-card hover:bg-accent/5 transition-colors"
            >
              <span className="font-medium text-foreground">⭐ ARC & Review Management</span>
              <span className="text-muted text-sm">{showARC ? "▲" : "▼"}</span>
            </button>
            {showARC && (
              <div className="px-5 py-4 space-y-4 border-t border-accent-dim">
                <p className="text-sm text-muted">Manage ARC reviewers, send review requests, and track reviews.</p>

                {reviewers.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {Object.entries(getReviewStats(reviewers)).map(([key, val]) => (
                      <div key={key} className="bg-card border border-accent-dim rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-accent">{val}</p>
                        <p className="text-xs text-muted capitalize">{key}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input value={newARCName} onChange={(e) => setNewARCName(e.target.value)} placeholder="Reviewer Name" className="flex-1 bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
                  <input value={newARCEmail} onChange={(e) => setNewARCEmail(e.target.value)} placeholder="Email" className="flex-1 bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
                  <select value={newARCFormat} onChange={(e) => setNewARCFormat(e.target.value as ARCReviewer["format"])} className="bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm">
                    <option value="ebook">eBook</option>
                    <option value="paperback">Paperback</option>
                    <option value="audiobook">Audiobook</option>
                  </select>
                  <button onClick={handleAddARC} disabled={!newARCEmail.includes("@")} className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-accent/90">Add</button>
                </div>

                <div>
                  <input ref={arcFileRef} type="file" accept=".csv" onChange={handleARCCSV} className="hidden" />
                  <button onClick={() => arcFileRef.current?.click()} className="text-sm text-accent hover:underline">+ Import from CSV (name,email,format)</button>
                </div>

                {reviewers.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {reviewers.map((r) => (
                      <div key={r.email} className="flex items-center gap-3 bg-card/50 rounded-lg px-3 py-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${
                          r.status === "reviewed" ? "bg-green-500" :
                          r.status === "sent" ? "bg-blue-500" :
                          r.status === "declined" ? "bg-red-500" : "bg-yellow-500"
                        }`} />
                        <span className="flex-1 text-foreground">{r.name} &lt;{r.email}&gt;</span>
                        <span className="text-xs text-muted uppercase">{r.format}</span>
                        <span className="text-xs text-muted capitalize">{r.status}</span>
                        {r.status === "pending" && (
                          <button onClick={() => handleSendARCReviewRequest(r)} disabled={sendingARC} className="text-xs text-accent hover:underline disabled:opacity-40">
                            {sendingARC ? "..." : "Send ARC"}
                          </button>
                        )}
                        {r.status === "reviewed" && r.reviewLink && (
                          <a href={r.reviewLink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">View Review</a>
                        )}
                        <button onClick={() => { const u = removeReviewer(r.email); setReviewers([...u]); }} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
