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

  const rate = await checkRateLimit(user.id, 100, supabase);
  if (!rate.allowed) {
    return Response.json({ error: rate.error }, { status: 429 });
  }

  try {
    const { text } = await req.json();
    if (!text || text.length < 100) {
      return Response.json({ error: "Text too short to analyze" }, { status: 400 });
    }

    const truncated = text.slice(0, 8000);

    const prompt = `You are a book analysis AI. Analyze the following manuscript text and extract structured information.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "extracted book title",
  "author": "extracted author name",
  "genre": "primary genre",
  "blurb": "2-3 sentence compelling book description",
  "themes": ["theme1", "theme2"],
  "tone": "overall narrative tone",
  "targetReader": "who would love this book",
  "tropes": ["trope1", "trope2"],
  "characters": [
    { "name": "character name", "role": "protagonist/antagonist/etc", "personality": "personality traits", "speechStyle": "how they speak", "secrets": "secrets or hidden motivations" }
  ],
  "keyQuotes": [
    { "quote": "memorable line from text", "context": "when/why it's said", "speaker": "who said it" }
  ],
  "keyScenes": [
    { "title": "scene title", "description": "what happens", "emotionalTone": "emotional tone", "characters": ["involved characters"], "chapter": 1 }
  ],
  "settingDescriptions": ["setting1", "setting2"],
  "coverDescription": "detailed description for generating a book cover image"
}

Extract AT LEAST:
- 3-5 characters — each with detailed personality, speechStyle (how they actually talk: formal/slang/flowery/etc), and secrets
- 5-10 key quotes — memorable lines with speaker and context
- 5-10 key scenes — with chapter number, emotional tone, and which characters appear
- 3-5 setting descriptions
- 3-5 themes
- 3-5 tropes

IMPORTANT: Every character MUST have a non-empty "personality", "speechStyle", and "secrets" field. Be thorough.

MANUSCRIPT TEXT:
${truncated}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return Response.json({ error: "Analysis failed" }, { status: 500 });

    const analysis = JSON.parse(content);
    return Response.json({ ...analysis, rawText: truncated });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return Response.json({ error: `⚠️ ${err.message || "Analysis failed"}` }, { status: 500 });
  }
}
