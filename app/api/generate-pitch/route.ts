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

  const { bookTitle, authorName, genre, tropes, pitchType, platform, influencerBio, isLarge } = await req.json();

  const prompt = `You are a literary PR specialist who writes outreach messages
that actually get responses. You never sound desperate or
copy-paste generic.

Book: '${bookTitle}' by ${authorName}
Genre: ${genre} | Tropes: ${tropes}
Pitch Type: ${pitchType}
Platform: ${platform}
Influencer Profile: ${influencerBio || "Not provided"}
Large Influencer: ${isLarge ? "Yes" : "No"}

Write one highly personalized outreach message.
Rules:
- Open with something specific from THEIR content/bio
  (shows you actually follow them)
- One sentence on why their audience specifically will
  love this book
- Clear, single ask — no multiple requests in one message
- Warm closing, no pressure
- Platform-appropriate length:
  DMs = 80-120 words max, Email = 150-200 words
- Never use: "I hope this message finds you well",
  "I am a huge fan", or any cringe opener

Include: [INFLUENCER NAME] and [YOUR NAME] as the only
placeholders — everything else must be fully written.`;

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
