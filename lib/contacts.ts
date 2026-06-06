export interface Contact {
  email: string;
  name: string;
}

const STORAGE_KEY = "inkreach_contacts";

export function getContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addContact(contact: Contact): Contact[] {
  const contacts = getContacts();
  if (contacts.some((c) => c.email.toLowerCase() === contact.email.toLowerCase())) {
    return contacts;
  }
  contacts.push(contact);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

export function addContacts(newContacts: Contact[]): Contact[] {
  const contacts = getContacts();
  const existingEmails = new Set(contacts.map((c) => c.email.toLowerCase()));
  for (const c of newContacts) {
    if (!existingEmails.has(c.email.toLowerCase())) {
      contacts.push(c);
      existingEmails.add(c.email.toLowerCase());
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

export function removeContact(email: string): Contact[] {
  const contacts = getContacts().filter((c) => c.email.toLowerCase() !== email.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

export function parseCSV(text: string): Contact[] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length >= 2) {
        return { name: parts[0], email: parts[1] };
      }
      if (parts[0]?.includes("@")) {
        return { name: parts[0].split("@")[0], email: parts[0] };
      }
      return null;
    })
    .filter((c): c is Contact => c !== null && c.email.includes("@"));
}
