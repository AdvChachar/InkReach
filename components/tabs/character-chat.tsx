'use client';

import { useState, useEffect } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { MessageBubble } from "@/components/ui/message-bubble";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function CharacterChat() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const analysis = getManuscriptAnalysis(bookId);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  const characters = analysis?.characters || [];
  const currentChar = characters[selectedCharacter];
  const protagonistName = (currentChar?.name || book?.protagonistName) ?? APP_CONFIG.protagonistName;
  const protagonistPersona = (currentChar?.personality || currentChar?.speechStyle || book?.protagonistPersona) ?? APP_CONFIG.protagonistPersona;
  const bookTitle = book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle;
  const systemPrompt = APP_CONFIG.chatbotSystemPrompt
    .replace("{protagonistName}", protagonistName)
    .replace("{bookTitle}", bookTitle)
    .replace("{protagonistPersona}", protagonistPersona);

  const suggestedQuestions = [
    `Tell me about your greatest fear`,
    `What's your happiest memory?`,
    `If you could change one thing about your story, what would it be?`,
    `What do you think of ${protagonistName === analysis?.characters[0]?.name && analysis?.characters[1] ? analysis.characters[1].name : "the other characters"}?`,
  ];

  const startChat = (question?: string) => {
    setShowIntro(false);
    if (question) {
      handleSend(question);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: `${systemPrompt}\n\nCharacter background: ${currentChar?.role || ""}. Personality: ${currentChar?.personality || ""}. Speech style: ${currentChar?.speechStyle || ""}. Secrets: ${currentChar?.secrets || ""}`,
          chatHistory: updatedHistory,
          protagonistName,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setChatHistory((prev) => [...prev, { role: "assistant", content: data.content }]);
        trackEvent("character_chat", bookTitle, { messages: updatedHistory.length });
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `... (Something went wrong. ${data.error || "Try again."})` },
        ]);
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "... (Connection failed. Check your internet.)" },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">💬 Chat with Your Characters</h3>
        <p className="text-sm text-foreground">
          From &lsquo;{bookTitle}&rsquo; — Powered by manuscript analysis
        </p>
      </div>

      {characters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {characters.slice(0, 6).map((c, i) => (
            <button
              key={i}
              onClick={() => { setSelectedCharacter(i); setChatHistory([]); setShowIntro(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCharacter === i
                  ? "bg-accent text-white"
                  : "bg-card border border-accent-dim text-muted hover:text-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {showIntro ? (
        <div className="bg-card border border-accent-dim rounded-xl p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">
              {characters.length > 0 ? "🎭" : "💬"}
            </div>
            <h4 className="text-lg font-semibold text-foreground">
              Chat with {protagonistName}
            </h4>
            {currentChar && (
              <p className="text-sm text-muted mt-1">
                {currentChar.role} — {currentChar.personality}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted">Suggested questions:</p>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => startChat(q)}
                className="w-full text-left bg-card/50 border border-accent-dim rounded-lg p-3 text-sm text-foreground hover:border-accent transition-colors"
              >
                {q}
              </button>
            ))}
            <button
              onClick={() => startChat()}
              className="w-full bg-gradient-to-r from-accent to-purple-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {`Ask ${protagonistName} Anything...`}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
          {chatHistory.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              protagonistName={protagonistName}
            />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-accent-dim rounded-xl px-4 py-2 mr-12">
                <p className="text-xs text-accent font-semibold mb-1">{protagonistName}</p>
                <p className="text-sm text-foreground">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!showIntro && (
        <>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Ask ${protagonistName} anything...`}
              disabled={loading}
              className="flex-1 bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted disabled:opacity-40"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-4 py-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setChatHistory([])}
              className="text-sm text-foreground hover:text-red-400 transition-colors"
            >
              🗑️ Clear Conversation
            </button>
            <button
              onClick={() => { setShowIntro(true); setChatHistory([]); }}
              className="text-sm text-accent hover:underline"
            >
              ⬅️ Switch Character
            </button>
          </div>
        </>
      )}

      <div className="bg-card border border-accent-dim rounded-xl p-4 text-sm text-foreground">
        💡 <strong className="text-accent">Premium Feature:</strong> This chatbot is trained on your book&rsquo;s
        characters and can be embedded on your author website.
        Fans can chat with your protagonist 24/7.
        Drives massive BookTok engagement.
      </div>
    </div>
  );
}
