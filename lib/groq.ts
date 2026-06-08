import Groq from "groq-sdk";

const keys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

const clients = keys.map((key) => new Groq({ apiKey: key }));

let currentIndex = 0;

interface CreateCompletionParams {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model: string;
  response_format?: { type: "json_object" };
}

export async function createChatCompletion(params: CreateCompletionParams) {
  const startIndex = currentIndex;
  for (let i = 0; i < clients.length; i++) {
    const idx = (startIndex + i) % clients.length;
    try {
      const result = await clients[idx].chat.completions.create(params as any);
      currentIndex = idx;
      return result;
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("rate_limit")) {
        currentIndex = (idx + 1) % clients.length;
        continue;
      }
      throw err;
    }
  }
  const errMsg =
    clients.length > 1
      ? "All Groq API keys are rate limited. Try again later."
      : "Groq API rate limit reached. Add GROQ_API_KEY_2 and GROQ_API_KEY_3 for automatic fallback.";
  throw new Error(errMsg);
}
