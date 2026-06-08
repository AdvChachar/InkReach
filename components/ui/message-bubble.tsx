'use client';

import { useState } from "react";
import { Copy, Check, Flag, Share2, Heart } from "lucide-react";
import { toast } from "sonner";

export function MessageBubble({
  role,
  content,
  protagonistName,
  bookId,
  characterName,
  onFlag,
  isLoved,
  onLove,
}: {
  role: "user" | "assistant";
  content: string;
  protagonistName: string;
  bookId?: string;
  characterName?: string;
  onFlag?: (response: string) => void;
  isLoved?: boolean;
  onLove?: () => void;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagged, setFlagged] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: content });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
      toast.success("Copied to clipboard");
    }
  };

  const handleFlag = () => {
    if (!onFlag) return;
    setShowFlagForm(true);
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] space-y-1">
        <div
          className={`rounded-xl px-4 py-2 ${
            isUser
              ? "bg-accent/20 ml-12"
              : "bg-card border border-accent-dim mr-12"
          }`}
        >
          {!isUser && (
            <p className="text-xs text-accent font-semibold mb-1">{protagonistName}</p>
          )}
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        {!isUser && (
          <div className="flex gap-2 mr-12 px-1">
            <button
              onClick={handleCopy}
              className="text-xs text-muted hover:text-accent transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleShare}
              className="text-xs text-muted hover:text-accent transition-colors"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {onLove && (
              <button
                onClick={onLove}
                className={`text-xs transition-colors ${isLoved ? "text-red-400" : "text-muted hover:text-red-400"}`}
                title={isLoved ? "Remove love" : "Love this response"}
              >
                <Heart className={`w-3.5 h-3.5 ${isLoved ? "fill-red-400" : ""}`} />
              </button>
            )}
            {onFlag && !flagged && (
              <button
                onClick={handleFlag}
                className="text-xs text-muted hover:text-red-400 transition-colors"
                title="Report a mistake"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
            {flagged && (
              <span className="text-xs text-yellow-400">Flagged</span>
            )}
          </div>
        )}
        {showFlagForm && !flagged && (
          <div className="mr-12 bg-card border border-border-subtle rounded-lg p-3 space-y-2">
            <p className="text-xs text-muted">What was wrong with this response?</p>
            <textarea
              placeholder="Describe the mistake and what the correct response should be..."
              className="w-full text-sm bg-dark border border-border-subtle rounded-lg p-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
              id={`flag-textarea-${content.slice(0, 10)}`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const ta = document.getElementById(`flag-textarea-${content.slice(0, 10)}`) as HTMLTextAreaElement;
                  if (!ta?.value?.trim()) {
                    toast.error("Please describe the mistake");
                    return;
                  }
                  onFlag?.(`MISTAKE: ${content}\n\nFEEDBACK: ${ta.value}`);
                  setFlagged(true);
                  setShowFlagForm(false);
                  toast.success("Thanks! This feedback will improve future responses.");
                }}
                className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg font-medium hover:bg-accent/90"
              >
                Send Report
              </button>
              <button
                onClick={() => setShowFlagForm(false)}
                className="text-xs text-muted px-3 py-1.5 rounded-lg hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
