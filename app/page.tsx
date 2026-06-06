'use client';

import { useState, useCallback, useEffect } from "react";
import { APP_CONFIG } from "@/config/client";
import { BookProvider } from "@/context/book-context";
import { Sidebar } from "@/components/sidebar";
import { TikTokHooks } from "@/components/tabs/tiktok-hooks";
import { EmailSequence } from "@/components/tabs/email-sequence";
import { InfluencerPitcher } from "@/components/tabs/influencer-pitcher";
import { CharacterChat } from "@/components/tabs/character-chat";
import { BookMockup } from "@/components/tabs/book-mockup";
import { SocialPosts } from "@/components/tabs/social-posts";
import { VideoGenerator } from "@/components/tabs/video-generator";
import { CampaignDashboard } from "@/components/tabs/campaign-dashboard";
import { Analytics } from "@/components/tabs/analytics";
import { Giveaways } from "@/components/tabs/giveaways";
import { Ads } from "@/components/tabs/ads";
import { ManuscriptWizard } from "@/components/tabs/manuscript-wizard";
import { PricingModal } from "@/components/pricing-modal";
import { trackEvent } from "@/lib/analytics";
import { getBooks } from "@/lib/books";

type TabId = "campaign" | "hooks" | "email" | "pitch" | "chat" | "mockup" | "social" | "video" | "analytics" | "giveaways" | "ads";

const PAID_TABS = new Set<TabId>([...APP_CONFIG.paidTabs] as TabId[]);

const TABS: { id: TabId; label: string }[] = [
  { id: "campaign", label: "🚀 Launch Campaign" },
  { id: "hooks", label: "📱 TikTok & IG Hooks" },
  { id: "email", label: "📧 30-Day Email Sequence" },
  { id: "pitch", label: "🎯 Influencer & ARC Pitcher" },
  { id: "chat", label: "🤖 Talk to My Character" },
  { id: "mockup", label: "📚 3D Book Mockup" },
  { id: "social", label: "📱 Social Posts" },
  { id: "video", label: "🎬 Video Generator" },
  { id: "analytics", label: "📊 Analytics" },
  { id: "giveaways", label: "🎁 Giveaways" },
  { id: "ads", label: "📢 Ads" },
];

function HomeInner() {
  const [hasManuscript, setHasManuscript] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [checked, setChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("hooks");
  const [wizardBookId, setWizardBookId] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("inkreach_unlocked") === "true";
    }
    return false;
  });

  const handleTabClick = useCallback((id: TabId) => {
    if (PAID_TABS.has(id) && !unlocked) {
      setShowPricing(true);
    } else {
      setActiveTab(id);
    }
  }, [unlocked]);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
    localStorage.setItem("inkreach_unlocked", "true");
  }, []);

  useEffect(() => {
    const forceWizard = typeof window !== "undefined" && sessionStorage.getItem("inkreach_show_wizard") === "true";
    if (forceWizard) sessionStorage.removeItem("inkreach_show_wizard");
    const books = getBooks();
    const hasReady = books.some((b) => b.manuscriptStatus === "ready");
    setHasManuscript(hasReady);
    if (forceWizard || (!hasReady && books.length <= 1)) setShowWizard(true);
    setChecked(true);

    const handler = () => { setShowWizard(true); setWizardKey((k) => k + 1); };
    window.addEventListener("inkreach-show-wizard", handler);
    return () => window.removeEventListener("inkreach-show-wizard", handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const licenseKey = params.get("license_key");
    if (licenseKey) {
      fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenseKey }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.valid) {
            handleUnlock();
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [handleUnlock]);

  useEffect(() => {
    const tabLabels: Record<TabId, string> = {
      campaign: "campaign", hooks: "hooks", email: "email", pitch: "pitch",
      chat: "chat", mockup: "mockup", social: "social", video: "video",
      analytics: "analytics", giveaways: "giveaways", ads: "ads",
    };
    trackEvent("generate_hooks", "", { tab: tabLabels[activeTab] });
  }, [activeTab]);

  if (!checked) return null;

  if (showWizard) {
    return (
      <div className="flex min-h-screen">
        <aside className="w-72 bg-card border-r border-accent-dim p-6 flex flex-col gap-5 h-screen sticky top-0 overflow-y-auto shrink-0">
          <div className="flex flex-col items-center gap-1 mb-1">
            <img src="/inkreach-icon.png" alt="InkReach" className="w-12 h-12 rounded" />
            <span className="text-base font-bold tracking-tight" style={{ color: APP_CONFIG.accentColor }}>InkReach<span className="text-[10px] uppercase tracking-widest text-muted font-medium ml-0.5">™</span></span>
          </div>
          <p className="text-xs text-muted text-center">AI-powered book marketing engine</p>
        </aside>
        <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
          <ManuscriptWizard key={wizardKey} onComplete={() => { setShowWizard(false); setHasManuscript(true); }} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-accent">{APP_CONFIG.appTitle}</h1>
          <p className="text-foreground mt-1">
            AI-Powered Book Marketing for Authors
          </p>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="w-full mb-6 bg-gradient-to-r from-accent to-purple-600 text-white font-bold rounded-xl px-6 py-4 text-lg transition-all hover:-translate-y-0.5 hover:shadow-xl flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📄</span>
          <span>Upload New Manuscript</span>
        </button>

        <div className="grid grid-cols-3 gap-2 mb-8">
          {TABS.map((tab) => {
            const isPaid = PAID_TABS.has(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative px-3 py-2.5 text-sm font-medium transition-colors rounded-lg ${
                  activeTab === tab.id && !isPaid
                    ? "text-white bg-accent"
                    : activeTab === tab.id && isPaid && unlocked
                    ? "text-white bg-accent"
                    : "text-muted bg-card border border-accent-dim hover:text-accent hover:border-accent"
                }`}
              >
                {tab.label}
                {isPaid && !unlocked && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <PricingModal open={showPricing} onClose={() => setShowPricing(false)} onUnlock={handleUnlock} />

        {activeTab === "hooks" && <TikTokHooks />}
        {activeTab === "email" && <EmailSequence />}
        {activeTab === "pitch" && <InfluencerPitcher />}
        {activeTab === "chat" && <CharacterChat />}
        {activeTab === "mockup" && <BookMockup />}
        {activeTab === "social" && <SocialPosts />}
        {activeTab === "campaign" && <CampaignDashboard />}
        {activeTab === "video" && <VideoGenerator />}
        {activeTab === "analytics" && <Analytics />}
        {activeTab === "giveaways" && <Giveaways />}
        {activeTab === "ads" && <Ads />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <BookProvider>
      <HomeInner />
    </BookProvider>
  );
}
