'use client';

import { useState, useEffect, useRef } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { MessageBubble } from "@/components/ui/message-bubble";
import { User, Trash2, Lightbulb, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  upsertChatToSupabase,
  type ChatMessage,
} from "@/lib/chat";

const RELIGIOUS_KEYWORDS = [
  "god", "prophet", "saint", "angel", "jesus", "muhammad", "moses", "buddha",
  "krishna", "allah", "lord", "savior", "messiah", "apostle", "messenger",
  "divine", "holy", "biblical", "quranic", "rabbi", "imam", "priest", "monk",
  "nun", "pope", "cardinal", "missionary", "preacher", "clergy", "theologian",
  "deity", "goddess", "worshipped",
];

function isReligiousFigure(name: string, role: string): boolean {
  const text = `${name} ${role}`.toLowerCase();
  return RELIGIOUS_KEYWORDS.some((kw) => text.includes(kw));
}

export function CharacterChat() {
  const { activeBook, user } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const analysis = getManuscriptAnalysis(bookId);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [loves, setLoves] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const characters = (analysis?.characters || []).filter(
    (c) => c.name.toLowerCase() !== "author" && !isReligiousFigure(c.name, c.role || "")
  );
  const currentChar = characters[selectedCharacter] || characters[0] || null;
  const bookAuthor = analysis?.author || "";
  const protagonistName = (currentChar?.name || book?.protagonistName) ?? APP_CONFIG.protagonistName;
  const protagonistPersona = (currentChar?.personality || currentChar?.speechStyle || book?.protagonistPersona) ?? APP_CONFIG.protagonistPersona;
  const bookTitle = book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle;

  const LOVE_KEY = `inkreach_loves_${bookId}_${selectedCharacter}`;
  const CORRECTIONS_KEY = `inkreach_corrections_${bookId}_${selectedCharacter}`;

  const loadLoves = () => {
    if (typeof window === "undefined") return new Set<number>();
    const raw = localStorage.getItem(LOVE_KEY);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
  };

  const persistLoves = (updated: Set<number>) => {
    localStorage.setItem(LOVE_KEY, JSON.stringify(Array.from(updated)));
  };

  const getCorrections = (): string[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(CORRECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  };

  const addCorrection = (original: string, feedback: string) => {
    const existing = getCorrections();
    existing.push(`The user said this response was incorrect: "${original.slice(0, 200)}". The correct information: "${feedback}". Learn from this and do not repeat the same mistake.`);
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(existing));
  };

  const corrections = getCorrections();
  const correctionsBlock = corrections.length > 0
    ? "\n\nPrevious mistakes to learn from:\n" + corrections.join("\n")
    : "";

  const systemPrompt = APP_CONFIG.chatbotSystemPrompt
    .replace("{protagonistName}", protagonistName)
    .replace("{bookTitle}", bookTitle)
    .replace("{protagonistPersona}", protagonistPersona) + correctionsBlock +
    "\n\nIMPORTANT: Never generate content about real religious figures, organized religion, sectarianism, or holy figures. Stick to the fictional story and characters only.";

  useEffect(() => {
    if (!bookId || initialized) return;
    const saved = getChatHistory(bookId, selectedCharacter);
    setChatHistory(saved);
    if (saved.length > 0) setShowIntro(false);
    setInitialized(true);
  }, [bookId, selectedCharacter, initialized]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    if (!bookId) return;
    setChatHistory([]);
    setShowIntro(true);
    const saved = getChatHistory(bookId, selectedCharacter);
    if (saved.length > 0) {
      setChatHistory(saved);
      setShowIntro(false);
    }
    setLoves(loadLoves());
  }, [selectedCharacter, bookId]);

  const persistChat = (messages: ChatMessage[]) => {
    if (!bookId) return;
    saveChatHistory(bookId, selectedCharacter, messages);
    if (user) {
      upsertChatToSupabase(user.id, bookId, selectedCharacter);
    }
  };

  const suggestedQuestions = currentChar
    ? [
        `Tell me about your greatest fear`,
        `What's your happiest memory?`,
        `What do you think of ${
          characters.length > 1
            ? characters.find((_, i) => i !== selectedCharacter)?.name || "the others"
            : "your story"
        }?`,
        `What's one secret you've never told anyone?`,
      ]
    : [];

  const startChat = (question?: string) => {
    setShowIntro(false);
    if (question) {
      handleSend(question);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text, characterName: protagonistName };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    persistChat(updatedHistory);
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
        const assistantMsg: ChatMessage = { role: "assistant", content: data.content, characterName: protagonistName };
        const newHistory = [...updatedHistory, assistantMsg];
        setChatHistory(newHistory);
        persistChat(newHistory);
        trackEvent("character_chat", bookTitle, { messages: updatedHistory.length });
      } else {
        const errHistory = [
          ...updatedHistory,
          { role: "assistant" as const, content: `... (Something went wrong. ${data.error || "Try again."})`, characterName: protagonistName },
        ];
        setChatHistory(errHistory);
        persistChat(errHistory);
      }
    } catch {
      const errHistory = [
        ...updatedHistory,
        { role: "assistant" as const, content: "... (Connection failed. Check your internet.)", characterName: protagonistName },
      ];
      setChatHistory(errHistory);
      persistChat(errHistory);
    }
    setLoading(false);
  };

  const handleFlag = async (response: string) => {
    if (!bookId || !currentChar) return;
    const parts = response.split("\n\nFEEDBACK: ");
    const originalResponse = parts[0]?.replace("MISTAKE: ", "") || "";
    const userFeedback = parts[1] || "";

    addCorrection(originalResponse, userFeedback);

    await fetch("/api/chat-flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        characterName: currentChar.name,
        originalResponse,
        userFeedback,
      }),
    });
  };

  const handleLove = (msgIndex: number) => {
    const updated = loadLoves();
    if (updated.has(msgIndex)) {
      updated.delete(msgIndex);
    } else {
      updated.add(msgIndex);
    }
    setLoves(updated);
    persistLoves(updated);
  };

  const handleClearChat = () => {
    if (!bookId) return;
    clearChatHistory(bookId, selectedCharacter);
    setChatHistory([]);
    setShowIntro(true);
  };

  const handleCopyAll = async () => {
    const text = chatHistory
      .map((m) => `${m.role === "user" ? "You" : (m.characterName || protagonistName)}: ${m.content}`)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    toast.success("Conversation copied");
  };

  const STORAGE_KEY_BOOKS = "inkreach_books";
  const getBooks = () => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY_BOOKS);
    return raw ? JSON.parse(raw) : [];
  };

  if (characters.length === 0) {
    return (
      <div className="bg-card border border-accent-dim rounded-xl p-8 text-center">
        <p className="text-muted">No characters found. Upload and analyze a manuscript first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chat with Your Characters</h3>
          <p className="text-sm text-muted">
            From &lsquo;{bookTitle}&rsquo; — {characters.length} characters available
          </p>
        </div>
        {chatHistory.length > 0 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Copy All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {characters.slice(0, 10).map((c, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedCharacter(i);
              setShowIntro(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedCharacter === i
                ? "bg-accent text-white"
                : "bg-card border border-accent-dim text-muted hover:text-accent"
            }`}
          >
            {c.name}{c.name === bookAuthor ? <span className="ml-1 text-xs opacity-70">(Author)</span> : null}{c.role ? <span className="ml-1 text-xs opacity-60">— {c.role}</span> : null}
          </button>
        ))}
      </div>

      {showIntro ? (
        <div className="bg-card border border-accent-dim rounded-xl p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">
              <User className="w-10 h-10 mx-auto text-accent" />
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
            {chatHistory.length > 0 && (
              <button
                onClick={() => setShowIntro(false)}
                className="w-full text-center bg-card border border-accent-dim rounded-lg p-3 text-sm text-accent hover:border-accent transition-colors"
              >
                Continue previous conversation ({chatHistory.length} messages)
              </button>
            )}
            <button
              onClick={() => startChat()}
              className="w-full bg-accent text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
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
              protagonistName={msg.characterName || protagonistName}
              bookId={bookId}
              characterName={currentChar?.name}
              onFlag={msg.role === "assistant" ? handleFlag : undefined}
              isLoved={msg.role === "assistant" ? loves.has(i) : undefined}
              onLove={msg.role === "assistant" ? () => handleLove(i) : undefined}
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
          <div ref={chatEndRef} />
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
              className="bg-accent text-white font-semibold rounded-lg px-4 py-2 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleClearChat}
              className="text-sm text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4 inline-block mr-1.5" />Clear Conversation
            </button>
            <button
              onClick={() => setShowIntro(true)}
              className="text-sm text-accent hover:underline"
            >
              ⬅️ Switch Character
            </button>
          </div>
        </>
      )}

      <div className="bg-card border border-accent-dim rounded-xl p-4 text-sm text-muted">
        <Lightbulb className="w-4 h-4 inline-block mr-1.5 text-accent" /> <strong className="text-accent">Note:</strong> Responses are AI-generated and may contain mistakes. Use the flag icon on any response to report inaccuracies.
      </div>
    </div>
  );
}
