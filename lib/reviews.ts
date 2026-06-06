export type ARCStatus = "pending" | "sent" | "reviewed" | "declined";

export interface ARCReviewer {
  email: string;
  name: string;
  format: "ebook" | "paperback" | "audiobook";
  status: ARCStatus;
  notes: string;
  dateAdded: string;
  dateSent?: string;
  dateReviewed?: string;
  reviewLink?: string;
}

const STORAGE_KEY = "inkreach_arcs";

export function getReviewers(): ARCReviewer[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveReviewers(reviewers: ARCReviewer[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewers));
  }
}

export function addReviewer(r: ARCReviewer): ARCReviewer[] {
  const list = getReviewers();
  if (list.some((x) => x.email.toLowerCase() === r.email.toLowerCase())) return list;
  list.push(r);
  saveReviewers(list);
  return list;
}

export function updateReviewerStatus(email: string, status: ARCStatus, extra?: Partial<ARCReviewer>): ARCReviewer[] {
  const list = getReviewers();
  const idx = list.findIndex((r) => r.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return list;
  list[idx] = { ...list[idx], status, ...extra };
  saveReviewers(list);
  return list;
}

export function removeReviewer(email: string): ARCReviewer[] {
  const list = getReviewers().filter((r) => r.email.toLowerCase() !== email.toLowerCase());
  saveReviewers(list);
  return list;
}

export function getReviewStats(reviewers: ARCReviewer[]): { total: number; sent: number; reviewed: number; pending: number; declined: number } {
  return {
    total: reviewers.length,
    sent: reviewers.filter((r) => r.status === "sent").length,
    reviewed: reviewers.filter((r) => r.status === "reviewed").length,
    pending: reviewers.filter((r) => r.status === "pending").length,
    declined: reviewers.filter((r) => r.status === "declined").length,
  };
}

export function parseARCCSV(text: string): Omit<ARCReviewer, "status" | "notes" | "dateAdded" | "dateSent" | "dateReviewed" | "reviewLink">[] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const email = parts[1];
        const format = (parts[2] || "ebook").toLowerCase() as ARCReviewer["format"];
        return { name, email, format: ["ebook", "paperback", "audiobook"].includes(format) ? format : "ebook" };
      }
      return null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.email.includes("@"));
}
