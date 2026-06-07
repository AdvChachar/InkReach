import Groq from "groq-sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id, 250);
  if (!rate.allowed) {
    return Response.json({ error: rate.error }, { status: 429 });
  }

  const { systemPrompt, chatHistory, protagonistName } = await req.json();

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of chatHistory) {
    const role = msg.role === "user" ? "user" : "assistant";
    messages.push({ role, content: msg.content });
  }

  messages.push({ role: "user", content: `Continue as ${protagonistName}.` });

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return Response.json({ error: "No response generated." }, { status: 500 });
    }
    return Response.json({ content: text });
  } catch (e: unknown) {
    const err = e as { message?: string };
    if (err.message?.includes("invalid_api_key") || err.message?.includes("401") || err.message?.includes("unauthorized")) {
      return Response.json({ error: "❌ Invalid API key. Check your GROQ_API_KEY in .env.local" }, { status: 401 });
    }
    if (err.message?.includes("network") || err.message?.includes("fetch")) {
      return Response.json({ error: "⚠️ Connection failed. Check your internet and try again." }, { status: 500 });
    }
    return Response.json({ error: `⚠️ ${err.message || "Something went wrong."}` }, { status: 500 });
  }
}
