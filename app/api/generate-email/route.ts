import { createServerSupabase } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createChatCompletion } from "@/lib/groq";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const rate = await checkRateLimit(user.id);
  if (!rate.allowed) {
    return Response.json({ error: rate.error }, { status: 429 });
  }

  const { bookTitle, authorName, launchDate, readerAvatar, tropes, bookBlurb } = await req.json();

  const prompt = `You are a direct-response email copywriter specializing in
indie author book launches. You write emails that feel personal,
not corporate. Readers open them because they feel like
a message from a friend.

Book: '${bookTitle}' by ${authorName}
Launch Date: ${launchDate || "TBD"}
Reader Avatar: ${readerAvatar || "Book lovers"}
Tropes: ${tropes || "N/A"}
Blurb: ${bookBlurb}

Write exactly 3 complete emails in this sequence:

EMAIL 1 — TEASER (Send: 14 days before launch)
Subject Line: (curiosity-driven, no spoilers)
Preview Text: (40 chars max)
Body: (150-200 words, build anticipation, end with 1 question
to drive replies)

EMAIL 2 — LAUNCH DAY (Send: Launch day, 9am)
Subject Line: (urgency + excitement)
Preview Text: (40 chars max)
Body: (200-250 words, emotional payoff, clear buy button CTA,
include 3 bullet points of what readers will feel)

EMAIL 3 — SOCIAL PROOF (Send: 7 days after launch)
Subject Line: (reader-reaction driven)
Preview Text: (40 chars max)
Body: (150-200 words, share early reader reactions concept,
ask for honest review, keep warm tone)

Format each email clearly. Write the complete body copy —
no placeholders, no [INSERT HERE] gaps.`;

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
