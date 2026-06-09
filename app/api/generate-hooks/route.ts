import { createServerSupabase } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createChatCompletion } from "@/lib/groq";

export async function POST(req: Request) {
  const supabase = await createServerSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id);
  if (!rate.allowed) {
    return Response.json({ error: rate.error }, { status: 429 });
  }

  const { bookTitle, authorName, genre, tone, bookBlurb, count, tropeScene } = await req.json();

  const prompt = `You are an elite BookTok content strategist with 2M+ followers.
Your hooks stop the scroll and make readers one-click buy.
Book: '${bookTitle}' by ${authorName}
Genre: ${genre} | Tone: ${tone}
Blurb: ${bookBlurb}
Trope/Scene: ${tropeScene || "N/A"}

Generate ${count} TikTok/Reel video concepts.
For EACH concept provide exactly:

🎬 CONCEPT [N]: [catchy concept title]
📱 POV Hook (on-screen text, max 12 words):
🎵 Audio Vibe: (describe trending sound style, no specific song names)
🎥 B-Roll Visuals: (3 specific visual shots to film/source)
🎙️ Voiceover Script: (15-25 seconds, conversational, emotional)
💬 Caption: (with 5 relevant hashtags including #BookTok)

Make each concept feel native to TikTok — NOT like an advertisement.`;

  try {
    const completion = await createChatCompletion({
      messages: [{ role: "user", content: prompt }],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return Response.json({ error: "No content generated. Try rephrasing your input." }, { status: 500 });
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
