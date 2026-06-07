'use client';

import { useState, useEffect } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { OutputCard, DownloadButton } from "@/components/ui/output-card";
import { RefreshCw, Crosshair } from "lucide-react";
import { getGeneratedContent } from "@/lib/generated-content";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import {
  getOutreachContacts,
  addOutreachContact,
  updateOutreachStatus,
  removeOutreachContact,
  getOutreachStats,
  type OutreachContact,
  type OutreachStatus,
} from "@/lib/outreach";

const STATUS_FLOW: { value: OutreachStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "text-muted" },
  { value: "sent", label: "Sent", color: "text-blue-400" },
  { value: "opened", label: "Opened", color: "text-yellow-400" },
  { value: "replied", label: "Replied", color: "text-accent" },
  { value: "booked", label: "Booked", color: "text-green-400" },
  { value: "declined", label: "Declined", color: "text-red-400" },
];

export function InfluencerPitcher() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const generated = getGeneratedContent(bookId);
  const analysis = getManuscriptAnalysis(bookId);
  const existingPitch = generated?.items.find((i) => i.type === "pitch");
  const [influencerName, setInfluencerName] = useState("");
  const [influencerBio, setInfluencerBio] = useState("");
  const [platform, setPlatform] = useState("Instagram DM");
  const [pitchType, setPitchType] = useState("ARC Review Request (Free Copy)");
  const [isLarge, setIsLarge] = useState(false);
  const [output, setOutput] = useState(existingPitch?.content || "");
  const [loading, setLoading] = useState(false);

  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [showTracker, setShowTracker] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setContacts(getOutreachContacts());
  }, []);

  const stats = getOutreachStats(contacts);

  const handleGenerate = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle,
          authorName: book?.authorName ?? APP_CONFIG.authorName,
          genre: (analysis?.genre || book?.bookGenre) ?? APP_CONFIG.bookGenre,
          tropes: ((analysis?.tropes || []).join(", ") || book?.bookTropes) ?? APP_CONFIG.bookTropes,
          blurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
          pitchType,
          platform,
          influencerBio: influencerBio || `A ${analysis?.targetReader || "reader"} on ${platform}`,
          isLarge,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setOutput(`❌ ${data.error}`);
      } else {
        setOutput(data.content);
        trackEvent("generate_pitch", book?.title ?? APP_CONFIG.bookTitle, { platform, pitchType });
      }
    } catch {
      setOutput("⚠️ Connection failed. Check your internet and try again.");
    }
    setLoading(false);
  };

  const handleSaveToTracker = () => {
    if (!influencerName) return;
    const updated = addOutreachContact({
      name: influencerName,
      handle: influencerName,
      platform,
      bio: influencerBio,
      status: "draft",
      pitchType,
      isLarge,
      notes,
      followUpAt: followUpDate ? new Date(followUpDate).toISOString() : "",
    });
    setContacts(updated);
    setFollowUpDate("");
    setNotes("");
    trackEvent("outreach_saved", book?.title ?? APP_CONFIG.bookTitle, { platform, pitchType });
  };

  const handleStatusChange = (id: string, status: OutreachStatus) => {
    const updated = updateOutreachStatus(id, status);
    setContacts(updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-foreground text-sm">
        Write personalized outreach messages for influencers and ARC reviewers.
      </p>

      {output && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          ✅ Pitch template pre-generated from your manuscript
        </div>
      )}

      {(analysis?.keyQuotes || []).length > 0 && (
        <div className="bg-card border border-accent-dim rounded-lg p-4 space-y-2">
          <label className="text-sm text-muted font-medium">Key Quotes from Your Book (Use in pitches)</label>
          <div className="space-y-2">
            {analysis!.keyQuotes.slice(0, 3).map((q, i) => (
              <div key={i} className="bg-card/50 rounded-lg p-2 text-sm border border-accent-dim">
                <p className="text-foreground italic">&ldquo;{q.quote}&rdquo;</p>
                <p className="text-xs text-muted mt-0.5">— {q.speaker} ({q.context})</p>
                <button
                  onClick={() => navigator.clipboard.writeText(q.quote)}
                  className="text-xs text-accent hover:underline mt-1 inline-block"
                >
                  Copy quote
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setShowTracker(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            !showTracker ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted"
          }`}
        >
          Generate Pitch
        </button>
        <button
          onClick={() => setShowTracker(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            showTracker ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted"
          }`}
        >
          Outreach Tracker ({contacts.length})
        </button>
      </div>

      {showTracker ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STATUS_FLOW.map((s) => (
              <div key={s.value} className="bg-card border border-accent-dim rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>
                  {s.value === "draft" ? stats.total - stats.sent :
                   s.value === "sent" ? stats.sent :
                   s.value === "opened" ? stats.opened :
                   s.value === "replied" ? stats.replied :
                   s.value === "booked" ? stats.booked :
                   stats.declined}
                </p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {stats.pendingFollowUp > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-300">
              ⏰ {stats.pendingFollowUp} follow-up{stats.pendingFollowUp !== 1 ? "s" : ""} due today
            </div>
          )}

          {contacts.length === 0 ? (
            <p className="text-muted text-sm">No outreach contacts yet. Generate a pitch and save it to the tracker.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="bg-card border border-accent-dim rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">{c.platform} • {c.pitchType}</p>
                      {c.bio && <p className="text-xs text-muted mt-1 line-clamp-2">{c.bio}</p>}
                    </div>
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value as OutreachStatus)}
                      className="text-xs bg-card border border-accent-dim rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {STATUS_FLOW.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted">
                    {c.sentAt && <span>Sent: {new Date(c.sentAt).toLocaleDateString()}</span>}
                    {c.followUpAt && (
                      <span className={new Date(c.followUpAt) <= new Date() && c.status !== "booked" && c.status !== "declined" ? "text-yellow-300" : ""}>
                        Follow-up: {new Date(c.followUpAt).toLocaleDateString()}
                      </span>
                    )}
                    {c.isLarge && <span className="text-accent">Large (100k+)</span>}
                    <button
                      onClick={() => {
                        const updated = removeOutreachContact(c.id);
                        setContacts(updated);
                      }}
                      className="ml-auto text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>

                  {c.notes && (
                    <p className="text-xs text-foreground bg-card/50 rounded px-2 py-1">{c.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Influencer Name / Handle</label>
            <input
              value={influencerName}
              onChange={(e) => setInfluencerName(e.target.value)}
              placeholder="@booktoker or full name"
              className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Influencer Bio / Description</label>
            <textarea
              value={influencerBio}
              onChange={(e) => setInfluencerBio(e.target.value)}
              placeholder={analysis?.targetReader || "Paste their Instagram bio or YouTube about section"}
              rows={3}
              className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Platform</label>
              <div className="flex flex-wrap gap-3">
                {["Instagram DM", "TikTok DM", "Email", "Twitter/X DM"].map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="platform"
                      value={p}
                      checked={platform === p}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="accent-accent"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Pitch Type</label>
              <div className="flex flex-wrap gap-3">
                {["ARC Review Request (Free Copy)", "Paid Collaboration Inquiry"].map((pt) => (
                  <label key={pt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="pitchType"
                      value={pt}
                      checked={pitchType === pt}
                      onChange={(e) => setPitchType(e.target.value)}
                      className="accent-accent"
                    />
                    {pt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isLarge}
              onChange={(e) => setIsLarge(e.target.checked)}
              className="accent-accent rounded"
            />
            This is a large influencer (100k+ followers)
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-accent text-white font-semibold rounded-lg px-4 py-2 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Generating..." : output ? <><RefreshCw className="w-4 h-4 inline-block mr-1.5" />Regenerate Pitch</> : <><Crosshair className="w-4 h-4 inline-block mr-1.5" />Generate Pitch</>}
            </button>

            {influencerName && (
              <button
                onClick={handleSaveToTracker}
                className="bg-card border border-accent text-accent font-medium rounded-lg px-4 py-2 text-sm hover:bg-accent/5 transition-colors"
              >
                + Save to Tracker
              </button>
            )}
          </div>

          {influencerName && (
            <div className="bg-card border border-accent-dim rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Outreach Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted">Follow-up Date (optional)</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">Notes (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes about this contact..."
                    className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
                  />
                </div>
              </div>
            </div>
          )}

          {output && (
            <>
              <OutputCard>{output}</OutputCard>
              <DownloadButton content={output} filename="influencer_pitch.txt" label="Download Pitch" />
              <p className="text-xs text-foreground italic">
                *Tip: Personalize [INFLUENCER NAME] before sending. Send during 6-9pm their local time for best open rates.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
