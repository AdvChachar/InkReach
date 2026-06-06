'use client';

export function MessageBubble({
  role,
  content,
  protagonistName,
}: {
  role: "user" | "assistant";
  content: string;
  protagonistName: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2 ${
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
    </div>
  );
}
