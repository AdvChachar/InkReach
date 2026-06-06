export type AdPlatform = "facebook" | "amazon" | "bookbub" | "instagram" | "tiktok";

export interface AdCampaign {
  id: string;
  title: string;
  platform: AdPlatform;
  budget: number;
  targetAudience: string;
  adCopy: string;
  headline: string;
  cta: string;
  status: "draft" | "running" | "paused" | "ended";
  startDate: string;
  endDate: string;
  bookTitle: string;
  createdAt: string;
}

const STORAGE_KEY = "inkreach_ads";

export function getAdCampaigns(): AdCampaign[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addAdCampaign(c: Omit<AdCampaign, "id" | "createdAt">): AdCampaign[] {
  const list = getAdCampaigns();
  list.push({ ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function updateAdCampaign(id: string, updates: Partial<AdCampaign>): AdCampaign[] {
  const list = getAdCampaigns().map((c) => (c.id === id ? { ...c, ...updates } : c));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function removeAdCampaign(id: string): AdCampaign[] {
  const list = getAdCampaigns().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}
