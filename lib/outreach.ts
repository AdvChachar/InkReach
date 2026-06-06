export type OutreachStatus = "draft" | "sent" | "opened" | "replied" | "booked" | "declined";

export interface OutreachContact {
  id: string;
  name: string;
  handle: string;
  platform: string;
  bio: string;
  status: OutreachStatus;
  pitchType: string;
  isLarge: boolean;
  notes: string;
  followUpAt: string;
  sentAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "inkreach_outreach";

export function getOutreachContacts(): OutreachContact[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addOutreachContact(contact: Omit<OutreachContact, "id" | "sentAt" | "updatedAt">): OutreachContact[] {
  const contacts = getOutreachContacts();
  const now = new Date().toISOString();
  const newContact: OutreachContact = {
    ...contact,
    id: crypto.randomUUID(),
    sentAt: contact.status === "sent" ? now : "",
    updatedAt: now,
  };
  contacts.push(newContact);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

export function updateOutreachStatus(id: string, status: OutreachStatus, extra?: Partial<OutreachContact>): OutreachContact[] {
  const contacts = getOutreachContacts().map((c) => {
    if (c.id !== id) return c;
    const update: Partial<OutreachContact> = { ...extra, status, updatedAt: new Date().toISOString() };
    if (status === "sent" && !c.sentAt) update.sentAt = new Date().toISOString();
    return { ...c, ...update };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

export function removeOutreachContact(id: string): OutreachContact[] {
  const contacts = getOutreachContacts().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

export function getOutreachStats(contacts: OutreachContact[]) {
  return {
    total: contacts.length,
    sent: contacts.filter((c) => c.status !== "draft").length,
    opened: contacts.filter((c) => c.status === "opened" || c.status === "replied" || c.status === "booked").length,
    replied: contacts.filter((c) => c.status === "replied" || c.status === "booked").length,
    booked: contacts.filter((c) => c.status === "booked").length,
    declined: contacts.filter((c) => c.status === "declined").length,
    pendingFollowUp: contacts.filter((c) => c.followUpAt && new Date(c.followUpAt) <= new Date() && c.status !== "booked" && c.status !== "declined").length,
  };
}
