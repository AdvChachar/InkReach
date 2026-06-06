export interface ScheduledPost {
  id: string;
  platform: string;
  caption: string;
  visualConcept: string;
  scheduledAt: string;
  status: "pending" | "posted" | "failed";
  createdAt: string;
  postedAt?: string;
}

const STORAGE_KEY = "inkreach_scheduled_posts";

export function getScheduledPosts(): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addScheduledPost(post: Omit<ScheduledPost, "id" | "createdAt" | "status">): ScheduledPost[] {
  const posts = getScheduledPosts();
  const newPost: ScheduledPost = {
    ...post,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  posts.push(newPost);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  return posts;
}

export function updatePostStatus(id: string, status: "posted" | "failed"): ScheduledPost[] {
  const posts = getScheduledPosts().map((p) =>
    p.id === id ? { ...p, status, postedAt: new Date().toISOString() } : p
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  return posts;
}

export function removeScheduledPost(id: string): ScheduledPost[] {
  const posts = getScheduledPosts().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  return posts;
}
