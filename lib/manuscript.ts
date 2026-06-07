export interface CharacterProfile {
  name: string;
  role: string;
  personality: string;
  speechStyle: string;
  secrets: string;
}

export interface KeyQuote {
  quote: string;
  context: string;
  speaker: string;
}

export interface KeyScene {
  title: string;
  description: string;
  emotionalTone: string;
  characters: string[];
  chapter: number;
}

export interface ManuscriptAnalysis {
  title: string;
  author: string;
  genre: string;
  blurb: string;
  themes: string[];
  tone: string;
  targetReader: string;
  tropes: string[];
  characters: CharacterProfile[];
  keyQuotes: KeyQuote[];
  keyScenes: KeyScene[];
  settingDescriptions: string[];
  coverDescription: string;
  rawText: string;
}

const ANALYSIS_KEY = "inkreach_manuscript_analysis";

export function getManuscriptAnalysis(bookId: string): ManuscriptAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${ANALYSIS_KEY}_${bookId}`);
  return raw ? JSON.parse(raw) : null;
}

export function saveManuscriptAnalysis(bookId: string, analysis: ManuscriptAnalysis) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${ANALYSIS_KEY}_${bookId}`, JSON.stringify(analysis));
}

export function deleteManuscriptAnalysis(bookId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${ANALYSIS_KEY}_${bookId}`);
}

export async function syncAnalysisFromSupabase(userId: string) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data } = await supabase
    .from("manuscript_analyses")
    .select("*")
    .eq("user_id", userId);
  if (data) {
    for (const row of data) {
      localStorage.setItem(
        `${ANALYSIS_KEY}_${row.book_id}`,
        JSON.stringify({ ...(row.analysis as ManuscriptAnalysis), rawText: row.raw_text || "" })
      );
    }
  }
}

export async function syncAnalysisToSupabase(userId: string) {
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const books = JSON.parse(localStorage.getItem("inkreach_books") || "[]") as { id: string }[];
  for (const book of books) {
    const raw = localStorage.getItem(`${ANALYSIS_KEY}_${book.id}`);
    if (!raw) continue;
    const analysis = JSON.parse(raw) as ManuscriptAnalysis;
    const { rawText, ...rest } = analysis;
    const { data: existing } = await supabase
      .from("manuscript_analyses")
      .select("id")
      .eq("book_id", book.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("manuscript_analyses").update({ analysis: rest, raw_text: rawText }).eq("id", existing.id);
    } else {
      await supabase.from("manuscript_analyses").insert({ book_id: book.id, user_id: userId, analysis: rest, raw_text: rawText });
    }
  }
}
