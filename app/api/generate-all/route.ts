import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getUserStatus() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isPro: false, userId: null };
  const { data: profile } = await supabase.from("profiles").select("subscription_status").eq("id", user.id).single();
  return { isPro: profile?.subscription_status === "pro", userId: user.id };
}

const PROMPTS: Record<string, (analysis: any) => string> = {
  hooks: (a) => `You are an elite BookTok content strategist. Generate 5 TikTok/Reel video concepts based on this book analysis.

Title: ${a.title}
Genre: ${a.genre}
Tone: ${a.tone}
Themes: ${(a.themes || []).join(", ")}
Tropes: ${(a.tropes || []).join(", ")}
Key Scenes: ${(a.keyScenes || []).map((s: any) => `Chapter ${s.chapter}: ${s.title}`).join(" | ")}
Key Quotes: ${(a.keyQuotes || []).slice(0, 3).map((q: any) => `"${q.quote}"`).join(" | ")}

Generate 5 scroll-stopping TikTok concepts with POV hook, audio vibe, b-roll visuals, voiceover script, and caption with hashtags.`,

  email: (a) => `You are a direct-response email copywriter for indie author book launches.

Book: ${a.title}
Genre: ${a.genre}
Blurb: ${a.blurb}
Themes: ${(a.themes || []).join(", ")}
Tropes: ${(a.tropes || []).join(", ")}

Write exactly 3 complete emails that are SPECIFIC to this book — mention actual character names, plot points, and themes from the book:
EMAIL 1 — TEASER (curiosity-driven)
EMAIL 2 — LAUNCH DAY (urgency + excitement)
EMAIL 3 — SOCIAL PROOF (reader reactions)

Format each with Subject Line, Preview Text, and Body.`,

  pitch: (a) => `You are a literary PR specialist. Write 3 personalized influencer outreach messages for the book '${a.title}' by ${a.author}.

Genre: ${a.genre} | Tropes: ${(a.tropes || []).join(", ")} | Themes: ${(a.themes || []).join(", ")} | Key characters: ${(a.characters || []).slice(0, 4).map((c: any) => c.name).join(", ")}

1. Instagram DM (80-120 words)
2. Email (150-200 words)
3. TikTok DM (80-120 words)

Each must reference SPECIFIC characters, scenes, or plot elements from this book. Use [INFLUENCER NAME] as the only placeholder.`,

  social: (a) => `You are a social media marketing expert for books. Create social media posts for the book '${a.title}' by ${a.author}.

Genre: ${a.genre}
Themes: ${(a.themes || []).join(", ")}
Characters: ${(a.characters || []).slice(0, 4).map((c: any) => `${c.name} (${c.role})`).join(", ")}
Quotes: ${(a.keyQuotes || []).slice(0, 5).map((q: any) => `"${q.quote}" — ${q.speaker}`).join(" | ")}

Create posts that are UNIQUE to this book — reference specific characters, scenes, and quotes:
- 2 Instagram posts (caption + visual concept + hashtags)
- 1 TikTok post (caption + visual concept + hashtags)
- 2 Twitter/X posts
- 1 Facebook post

Make each feel native to its platform.`,

  ad: (a) => `You are a book advertising copywriter. Create ad copy variations for '${a.title}' by ${a.author}.

Key quotes for inspiration: ${(a.keyQuotes || []).slice(0, 5).map((q: any) => `"${q.quote}"`).join(" | ")}
Themes: ${(a.themes || []).join(", ")}
Tropes: ${(a.tropes || []).join(", ")}
Characters: ${(a.characters || []).slice(0, 3).map((c: any) => c.name).join(", ")}
Setting: ${(a.settingDescriptions || []).slice(0, 2).join(" | ")}

For each platform below, provide 3 ad variations that reference SPECIFIC book details (character names, plot hooks, settings):
Platforms: Facebook, Instagram, Amazon, TikTok.`,

  video: (a) => `You are a video marketing strategist for books. Generate 3 video prompt ideas for AI-generated book trailers.

Book: ${a.title}
Genre: ${a.genre}
Tone: ${a.tone}
Key Scenes: ${(a.keyScenes || []).slice(0, 5).map((s: any) => `- ${s.title}: ${s.description} (tone: ${s.emotionalTone})`).join("\n")}
Characters: ${(a.characters || []).slice(0, 4).map((c: any) => `${c.name} — ${c.personality}`).join(" | ")}
Setting Descriptions: ${(a.settingDescriptions || []).join(" | ")}

For each prompt provide: title, cinematic description (50-80 words) featuring SPECIFIC characters and settings from this book, aspect ratio recommendation, and mood/tone.`,
};

const PAID_TYPES = new Set(["social", "video", "ad"]);

export async function POST(req: Request) {
  try {
    const { analysis, types } = await req.json();
    if (!analysis) return Response.json({ error: "Analysis data required" }, { status: 400 });

    const { isPro, userId } = await getUserStatus();
    if (userId) {
      const rate = await checkRateLimit(userId);
      if (!rate.allowed) {
        return Response.json({ error: rate.error }, { status: 429 });
      }
    }
    let toGenerate: string[] = types || Object.keys(PROMPTS);

    if (!isPro) {
      toGenerate = toGenerate.filter((t) => !PAID_TYPES.has(t));
    }

    const results: { type: string; content: string; label: string }[] = [];

    for (const type of toGenerate) {
      if (!PROMPTS[type]) continue;
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: PROMPTS[type](analysis) }],
          model: "llama-3.3-70b-versatile",
        });
        const text = completion.choices[0]?.message?.content;
        results.push({ type, content: text || "Generation failed", label: type });
      } catch {
        results.push({ type, content: "Generation failed due to an error", label: type });
      }
    }

    return Response.json({ results });
  } catch {
    return Response.json({ error: "Batch generation failed" }, { status: 500 });
  }
}
