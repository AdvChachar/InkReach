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
