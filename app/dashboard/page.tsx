'use client';

import { useState, useCallback, useEffect } from "react";
import { APP_CONFIG } from "@/config/client";
import { BookProvider } from "@/context/book-context";
import { useTheme } from "@/context/theme-context";
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
import { Menu, Sun, Moon, Rocket, Smartphone, Mail, Crosshair, Bot, BookOpen, Share2, Clapperboard, BarChart3, Gift, Megaphone, FileText } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import type { LucideIcon } from "lucide-react";

type TabId = "campaign" | "hooks" | "email" | "pitch" | "chat" | "mockup" | "social" | "video" | "analytics" | "giveaways" | "ads";

const PAID_TABS = new Set<TabId>([...APP_CONFIG.paidTabs] as TabId[]);

const TAB_ICONS: Record<TabId, LucideIcon> = {
  campaign: Rocket,
  hooks: Smartphone,
  email: Mail,
  pitch: Crosshair,
  chat: Bot,
  mockup: BookOpen,
  social: Share2,
  video: Clapperboard,
  analytics: BarChart3,
  giveaways: Gift,
  ads: Megaphone,
};

const TABS: { id: TabId; label: string }[] = [
  { id: "campaign", label: "Launch Campaign" },
  { id: "hooks", label: "TikTok & IG Hooks" },
  { id: "email", label: "30-Day Email Sequence" },
  { id: "pitch", label: "Influencer & ARC Pitcher" },
  { id: "chat", label: "Talk to My Character" },
  { id: "mockup", label: "3D Book Mockup" },
  { id: "social", label: "Social Posts" },
  { id: "video", label: "Video Generator" },
  { id: "analytics", label: "Analytics" },
  { id: "giveaways", label: "Giveaways" },
  { id: "ads", label: "Ads" },
];

function DashboardInner() {
  const { theme, toggle } = useTheme();
  const [hasManuscript, setHasManuscript] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [checked, setChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("hooks");
  const [showPricing, setShowPricing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    trackEvent("generate_hooks", "", { tab: activeTab });
  }, [activeTab]);

  if (!checked) return null;

  const topBar = (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0F0A1E] border-b border-gray-200 dark:border-border-subtle">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-accent-dim text-gray-700 dark:text-foreground transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/inkreach-icon.png" alt="InkReach" className="w-7 h-7 rounded" />
            <span className="font-bold text-gray-900 dark:text-foreground text-base">InkReach</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-accent-dim text-gray-500 dark:text-muted transition-colors" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );

  if (showWizard) {
    return (
      <div className="min-h-screen flex flex-col">
        {topBar}
        <div className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
          <ManuscriptWizard key={wizardKey} onComplete={() => { setShowWizard(false); setHasManuscript(true); }} onClose={() => setShowWizard(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {topBar}

      <div className="flex flex-1">
        <div className="max-lg:hidden shrink-0"><Sidebar /></div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full min-w-0">

        <div className="lg:hidden mb-6 slide-down">
          <h1 className="text-2xl font-bold text-foreground">{APP_CONFIG.appTitle}</h1>
          <p className="text-foreground text-sm mt-0.5">AI-Powered Book Marketing for Authors</p>
        </div>

        <button onClick={() => setShowWizard(true)}
          className="w-full mb-6 bg-accent text-white font-bold rounded-lg px-6 py-3.5 text-base transition-all hover:bg-accent/90 active:scale-[0.98] flex items-center justify-center gap-2.5 fade-in">
          <FileText className="w-5 h-5" />
          <span>Upload New Manuscript</span>
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {TABS.map((tab) => {
            const isPaid = PAID_TABS.has(tab.id);
            const Icon = TAB_ICONS[tab.id];
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={`relative flex items-center gap-1.5 px-2.5 py-2.5 text-xs sm:text-sm font-medium transition-all rounded-lg ${
                  activeTab === tab.id && (!isPaid || unlocked)
                    ? "text-white bg-accent"
                    : "text-muted bg-card border border-border-subtle hover:text-accent hover:border-accent"
                }`}>
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{tab.label}</span>
                {isPaid && !unlocked && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider bg-accent text-white px-1.5 py-0.5 rounded font-bold">Pro</span>
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

    {sidebarOpen && (
      <div className="sidebar-overlay open lg:hidden" onClick={() => setSidebarOpen(false)} />
    )}

    <div className={`sidebar-drawer lg:hidden ${sidebarOpen ? "open" : ""}`}>
      <Sidebar />
      <button onClick={() => setSidebarOpen(false)}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-accent-dim text-muted hover:text-foreground transition-colors" aria-label="Close sidebar">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
  );
}

export default function DashboardPage() {
  return (
    <BookProvider>
      <DashboardInner />
    </BookProvider>
  );
}
