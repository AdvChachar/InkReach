import Groq from "groq-sdk";

const keys: string[] = [];
if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
for (let i = 2; i <= 20; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key) keys.push(key);
}

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
      : "Groq API rate limit reached. Create more accounts and add as GROQ_API_KEY_2, _3, etc. for automatic fallback.";
  throw new Error(errMsg);
}
