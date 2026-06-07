'use client';

import { useState } from "react";
import { APP_CONFIG } from "@/config/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onUnlock: (key: string) => void;
}

export function PricingModal({ open, onClose, onUnlock }: Props) {
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  if (!open) return null;

  const handleUnlock = async () => {
    if (!key.trim()) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        onUnlock(key.trim());
        onClose();
      } else {
        setError(data.error || "Invalid key");
      }
    } catch {
      setError("Connection failed");
    }
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border-subtle rounded-xl p-4 sm:p-8 max-w-md w-full mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⭐</div>
          <h2 className="text-2xl font-bold text-foreground">Unlock Premium Features</h2>
          <p className="text-foreground mt-2 text-sm">
            3D Mockups, Social Posts &amp; Video Generator
          </p>
        </div>

        <div className="bg-accent/5 border border-border-subtle rounded-xl p-5 text-center mb-6">
          <span className="text-3xl font-bold text-accent">${APP_CONFIG.subscriptionPrice}</span>
          <span className="text-foreground"> /month</span>
          <ul className="text-sm text-foreground mt-3 space-y-1.5 text-left">
            <li>✅ 3D Book Cover Mockups</li>
            <li>✅ Social Media Post Generator</li>
            <li>✅ AI Video Trailer Generator</li>
            <li>✅ Priority support</li>
          </ul>
        </div>

        {showKeyInput ? (
          <div className="space-y-3">
            <p className="text-xs text-foreground text-center">Enter your license key to unlock</p>
            <div className="flex gap-2">
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
                placeholder="License key"
                className="flex-1 bg-dark text-foreground border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder:text-muted"
              />
              <button
                onClick={handleUnlock}
                disabled={checking || !key.trim()}
                className="bg-accent text-white font-semibold rounded-lg px-4 py-2 text-sm transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40"
              >
                {checking ? "..." : "Unlock"}
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={() => setShowKeyInput(false)} className="text-xs text-muted hover:text-accent">
              ← Back to subscribe
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {APP_CONFIG.checkoutUrl && (
              <a
                href={APP_CONFIG.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-accent text-white font-semibold rounded-lg px-4 py-3 text-center text-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
              >
                Subscribe ${APP_CONFIG.subscriptionPrice}/month
              </a>
            )}
            <button onClick={() => setShowKeyInput(true)} className="block w-full text-xs text-muted hover:text-accent text-center">
              Already have a license key? Enter it here
            </button>
          </div>
        )}

        <p className="text-xs text-foreground text-center mt-4">
          Contact <span className="text-muted">Softlancer</span> to purchase a license
        </p>
      </div>
    </div>
  );
}
