'use client';

import { useState, useEffect } from "react";
import {
  getAdCampaigns,
  addAdCampaign,
  updateAdCampaign,
  removeAdCampaign,
  type AdCampaign,
  type AdPlatform,
} from "@/lib/ads";
import { useBook } from "@/context/book-context";
import { getGeneratedContent, type GeneratedItem } from "@/lib/generated-content";

const PLATFORMS: { id: AdPlatform; label: string; icon: string }[] = [
  { id: "facebook", label: "Facebook Ads", icon: "📘" },
  { id: "instagram", label: "Instagram Ads", icon: "📸" },
  { id: "amazon", label: "Amazon Ads", icon: "📦" },
  { id: "bookbub", label: "BookBub", icon: "📚" },
  { id: "tiktok", label: "TikTok Ads", icon: "🎵" },
];

export function Ads() {
  const { activeBook } = useBook();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState<AdPlatform>("facebook");
  const [budget, setBudget] = useState(50);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVariation, setSelectedVariation] = useState<{ headline: string; copy: string; cta: string } | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const bookId = activeBook?.id || "";
  const generated = getGeneratedContent(bookId);
  const adItem: GeneratedItem | undefined = generated?.items.find((i) => i.type === "ad");

  useEffect(() => {
    setCampaigns(getAdCampaigns());
  }, []);

  const parsedAds = (() => {
    if (!adItem?.content) return [];
    const lines = adItem.content.split("\n").filter(Boolean);
    const variations: { headline: string; copy: string; cta: string; platform: string }[] = [];
    let current: any = {};

    for (const line of lines) {
      if (line.includes("Facebook") || line.includes("Instagram") || line.includes("Amazon") || line.includes("TikTok") || line.includes("BookBub")) {
        if (current.headline) variations.push(current);
        current = { platform: line.replace(/^[\s#*]+/, "").trim(), headline: "", copy: "", cta: "" };
      } else if (line.match(/Headline|headline|HEADLINE/)) {
        current.headline = line.replace(/^[\s#*]*Headline:?\s*/i, "").trim();
      } else if (line.match(/CTA|cta/)) {
        current.cta = line.replace(/^[\s#*]*CTA:?\s*/i, "").trim();
      } else if (line.match(/Copy|copy|COPY|Body|body/) || (current.headline && !current.cta)) {
        if (!current.copy) current.copy = "";
        current.copy += line.replace(/^[\s#*]*(Copy|Body|Ad Copy):?\s*/i, "").trim() + " ";
      }
    }
    if (current.headline) variations.push(current);
    return variations;
  })();

  const handleCreateFromVariation = () => {
    if (!selectedVariation) return;
    const campaignTitle = `${platform} Ad — ${selectedVariation.headline.slice(0, 40)}`;
    const updated = addAdCampaign({
      title: campaignTitle,
      platform,
      budget,
      targetAudience: activeBook?.targetReader || "",
      adCopy: selectedVariation.copy,
      headline: selectedVariation.headline,
      cta: selectedVariation.cta,
      status: "draft",
      startDate,
      endDate,
      bookTitle: activeBook?.title || "",
    });
    setCampaigns(updated);
    setShowForm(false);
    setSelectedVariation(null);
    setShowPicker(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">📢 Ad Campaigns</h2>
          <p className="text-sm text-muted">
            {parsedAds.length > 0
              ? "Pick a pre-generated ad variation and set your budget."
              : "Your ad copy has been pre-generated from your manuscript."}
          </p>
        </div>
        {parsedAds.length > 0 && (
          <button
            onClick={() => { setShowForm(true); setShowPicker(true); }}
            className="bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-4 py-2 text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            + New from Pre-Generated
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-accent-dim rounded-xl p-5 space-y-4">
          {showPicker && parsedAds.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm text-muted font-medium">Pick an Ad Variation</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedAds.map((ad, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedVariation(ad);
                      setPlatform(ad.platform.toLowerCase().includes("facebook") ? "facebook" :
                        ad.platform.toLowerCase().includes("instagram") ? "instagram" :
                        ad.platform.toLowerCase().includes("amazon") ? "amazon" :
                        ad.platform.toLowerCase().includes("tiktok") ? "tiktok" : "facebook");
                    }}
                    className={`w-full text-left bg-card/50 border rounded-lg p-3 transition-all ${
                      selectedVariation === ad ? "border-accent ring-1 ring-accent" : "border-accent-dim hover:border-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted uppercase">{ad.platform}</span>
                      {selectedVariation === ad && <span className="text-xs text-accent">Selected</span>}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1">{ad.headline}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{ad.copy}</p>
                    <p className="text-xs text-accent mt-1">{ad.cta}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${platform === p.id ? "bg-accent text-white" : "bg-card border border-accent-dim text-muted hover:text-accent"}`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Daily Budget ($)</label>
              <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min={1} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Target Audience</label>
              <input value={activeBook?.targetReader || ""} disabled className="w-full bg-card/50 text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm opacity-60" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateFromVariation}
              disabled={!selectedVariation}
              className="bg-accent text-white font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-40 hover:bg-accent/90 transition-colors"
            >
              Create Campaign
            </button>
            <button onClick={() => { setShowForm(false); setSelectedVariation(null); setShowPicker(false); }} className="text-sm text-muted hover:text-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      {parsedAds.length > 0 && !showForm && (
        <div className="bg-card border border-accent-dim rounded-xl p-5 space-y-3">
          <label className="text-sm text-muted font-medium">Pre-Generated Ad Variations</label>
          <div className="grid grid-cols-1 gap-3">
            {parsedAds.map((ad, i) => (
              <div key={i} className="bg-card/50 border border-accent-dim rounded-lg p-4 space-y-2">
                <span className="text-xs text-muted uppercase">{ad.platform}</span>
                <p className="text-sm font-medium text-foreground">{ad.headline}</p>
                <p className="text-sm text-muted">{ad.copy}</p>
                <p className="text-xs text-accent font-medium">{ad.cta}</p>
                <button
                  onClick={() => { setShowForm(true); setShowPicker(true); setSelectedVariation(ad); }}
                  className="text-xs text-accent hover:underline"
                >
                  Use This
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!adItem && !showForm && (
        <div className="bg-card border border-accent-dim rounded-xl p-8 text-center text-sm text-muted">
          Upload your manuscript and generate all content to get pre-written ad copy variations for every platform.
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Your Campaigns</h3>
          {campaigns.map((c) => (
            <div key={c.id} className="bg-card border border-accent-dim rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span>{PLATFORMS.find((p) => p.id === c.platform)?.icon}</span>
                  <span className="text-sm font-medium text-foreground">{c.title}</span>
                </div>
                <select
                  value={c.status}
                  onChange={(e) => { const u = updateAdCampaign(c.id, { status: e.target.value as AdCampaign["status"] }); setCampaigns(u); }}
                  className="text-xs bg-card border border-accent-dim rounded px-2 py-1 text-foreground"
                >
                  <option value="draft">Draft</option>
                  <option value="running">Running</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              {c.headline && <p className="text-xs text-foreground font-medium">{c.headline}</p>}
              {c.adCopy && <p className="text-xs text-muted">{c.adCopy}</p>}
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>${c.budget}/day</span>
                {c.startDate && <span>Start: {new Date(c.startDate).toLocaleDateString()}</span>}
                <button onClick={() => { const u = removeAdCampaign(c.id); setCampaigns(u); }} className="ml-auto text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
