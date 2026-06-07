import Link from "next/link";
import { APP_CONFIG } from "@/config/client";
import { Rocket, Smartphone, Mail, Crosshair, Bot, BookOpen, Share2, Clapperboard, BarChart3, Gift, Megaphone, ArrowRight, Check } from "lucide-react";

const FEATURES = [
  { icon: Smartphone, title: "TikTok & IG Hooks", desc: "Scroll-stopping video concepts tailored to your book. Generate 5 viral hooks in seconds." },
  { icon: Mail, title: "30-Day Email Sequence", desc: "Nurture readers with a full pre-launch email campaign. Send directly to your list." },
  { icon: Crosshair, title: "Influencer Pitcher", desc: "Personalized outreach to book influencers and ARC reviewers. Track responses." },
  { icon: Bot, title: "Character Chatbot", desc: "Let readers talk to your protagonist. AI roleplay trained on your manuscript." },
  { icon: BookOpen, title: "3D Book Mockup", desc: "AI-generated book cover mockups in 3D. Front, back, spine — fully customizable." },
  { icon: Share2, title: "Social Posts", desc: "Platform-native posts for Instagram, TikTok, Twitter, and Facebook. Schedule them." },
  { icon: Clapperboard, title: "Video Generator", desc: "AI video trailers from your book's key scenes. Cinematic prompts ready to render." },
  { icon: BarChart3, title: "Analytics", desc: "Track your marketing performance. See which hooks, emails, and posts perform best." },
  { icon: Gift, title: "Giveaways", desc: "Run book giveaways. Collect entries, pick winners, manage the whole flow." },
  { icon: Megaphone, title: "Ad Campaigns", desc: "Create and manage ads for Facebook, Instagram, Amazon, BookBub, and TikTok." },
  { icon: Rocket, title: "Campaign Dashboard", desc: "All-in-one launch command center. Tasks, calendar, landing page, ARC management." },
];

const PRICING_FEATURES = [
  "Upload & analyze any manuscript",
  "AI-generated TikTok hooks",
  "30-day email sequence",
  "Influencer outreach pitches",
  "Character chatbot",
  "3D book mockups",
  "Social media post generator",
  "AI video trailers",
  "Full analytics dashboard",
  "Giveaway management",
  "Ad campaign builder",
  "Campaign launch dashboard",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/inkreach-icon.png" alt="" className="w-7 h-7 rounded" />
            <span className="font-bold text-gray-900 text-lg">InkReach</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2">
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm bg-[#1dbf73] text-white font-semibold rounded-lg px-4 py-2 hover:bg-[#19a865] transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
          AI-Powered Marketing Engine
          <br />
          <span className="text-[#1dbf73]">for Authors</span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
          Upload your manuscript. Generate hooks, emails, pitches, social posts, and video trailers — all from your book&apos;s content. No more staring at a blank page.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="bg-[#1dbf73] text-white font-semibold rounded-lg px-6 py-3 text-base hover:bg-[#19a865] transition-colors flex items-center gap-2"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="bg-white text-gray-700 font-medium rounded-lg px-6 py-3 text-base border border-gray-300 hover:border-gray-400 transition-colors"
          >
            Try the Demo
          </Link>
        </div>
        <p className="mt-3 text-sm text-gray-400">No credit card required. Free tier includes 5 generations/day.</p>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Everything You Need to Launch</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            From manuscript upload to marketing campaign — all in one place.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#1dbf73]/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#1dbf73]/10 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-[#1dbf73]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Simple Pricing</h2>
        <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
          Start free. Upgrade when you&apos;re ready to publish.
        </p>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Free</h3>
            <p className="text-3xl font-bold text-gray-900 mb-4">$0<span className="text-sm font-normal text-gray-500">/month</span></p>
            <ul className="space-y-2 mb-6">
              {PRICING_FEATURES.slice(0, 5).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-[#1dbf73] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <Check className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                <span className="line-through">All premium features</span>
              </li>
            </ul>
            <Link href="/register" className="block w-full text-center border border-gray-300 text-gray-700 font-medium rounded-lg px-4 py-2.5 text-sm hover:border-gray-400 transition-colors">
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-xl border-2 border-[#1dbf73] p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1dbf73] text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Pro</h3>
            <p className="text-3xl font-bold text-gray-900 mb-4">${APP_CONFIG.subscriptionPrice}<span className="text-sm font-normal text-gray-500">/month</span></p>
            <ul className="space-y-2 mb-6">
              {PRICING_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-[#1dbf73] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={APP_CONFIG.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-[#1dbf73] text-white font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-[#19a865] transition-colors"
            >
              Subscribe ${APP_CONFIG.subscriptionPrice}/month
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to Launch Your Book?</h2>
          <p className="text-gray-400 mb-6">
            Join thousands of authors using InkReach to market their books with AI.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-[#1dbf73] text-white font-semibold rounded-lg px-6 py-3 text-base hover:bg-[#19a865] transition-colors"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/inkreach-icon.png" alt="" className="w-5 h-5 rounded" />
            <span className="text-sm font-semibold text-gray-300">InkReach</span>
          </div>
          <p className="text-xs text-gray-500">Powered by Softlancer</p>
        </div>
      </footer>
    </div>
  );
}
