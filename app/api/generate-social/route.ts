import { requireSubscription } from "@/lib/check-subscription";
import { checkRateLimit } from "@/lib/rate-limit";
import { createChatCompletion } from "@/lib/groq";

export async function POST(req: Request) {
  const sub = await requireSubscription();
  if (!sub.allowed) {
    return Response.json({ error: sub.error }, { status: sub.status });
  }

  const rate = await checkRateLimit(sub.user!.id);
  if (!rate.allowed) {
    return Response.json({ error: rate.error }, { status: 429 });
  }

  const { bookTitle, authorName, genre, bookBlurb, platform, postStyle } = await req.json();

  const prompt = `You are a social media marketing expert for books.
Book: '${bookTitle}' by ${authorName}
Genre: ${genre}
Blurb: ${bookBlurb}

Create 3 social media posts for ${platform} to promote this book.
Style: ${postStyle || "Engaging and authentic"}

For EACH post provide:
📝 POST [N]:
📋 Caption: (2-3 sentences, platform-appropriate length)
🔍 Visual Concept: (describe the image/graphic to pair with this post)
🏷️ Hashtags: (5-8 relevant hashtags)

Make each post feel native to ${platform} — not like an ad.`;

  try {
    const completion = await createChatCompletion({
      messages: [{ role: "user", content: prompt }],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return Response.json({ error: "No content generated." }, { status: 500 });
    }
    return Response.json({ content: text });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return Response.json({ error: `⚠️ ${err.message || "Something went wrong."}` }, { status: 500 });
  }
}
