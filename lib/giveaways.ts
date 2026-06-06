export type GiveawayStatus = "draft" | "running" | "ended";

export interface Giveaway {
  id: string;
  title: string;
  prize: string;
  entryInstructions: string;
  status: GiveawayStatus;
  startDate: string;
  endDate: string;
  maxEntries: number;
  entries: GiveawayEntry[];
  createdAt: string;
}

export interface GiveawayEntry {
  name: string;
  email: string;
  enteredAt: string;
}

const STORAGE_KEY = "inkreach_giveaways";

export function getGiveaways(): Giveaway[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addGiveaway(g: Omit<Giveaway, "id" | "entries" | "createdAt">): Giveaway[] {
  const list = getGiveaways();
  list.push({ ...g, id: crypto.randomUUID(), entries: [], createdAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function updateGiveaway(id: string, updates: Partial<Giveaway>): Giveaway[] {
  const list = getGiveaways().map((g) => (g.id === id ? { ...g, ...updates } : g));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function removeGiveaway(id: string): Giveaway[] {
  const list = getGiveaways().filter((g) => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function addEntry(giveawayId: string, entry: Omit<GiveawayEntry, "enteredAt">): Giveaway[] {
  const list = getGiveaways().map((g) => {
    if (g.id !== giveawayId) return g;
    if (g.entries.length >= g.maxEntries) return g;
    if (g.entries.some((e) => e.email.toLowerCase() === entry.email.toLowerCase())) return g;
    return { ...g, entries: [...g.entries, { ...entry, enteredAt: new Date().toISOString() }] };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function pickWinner(giveawayId: string): { name: string; email: string } | null {
  const list = getGiveaways();
  const g = list.find((g) => g.id === giveawayId);
  if (!g || g.entries.length === 0) return null;
  const winner = g.entries[Math.floor(Math.random() * g.entries.length)];
  return { name: winner.name, email: winner.email };
}
