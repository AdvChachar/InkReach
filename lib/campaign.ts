export type CampaignPhase = "pre-launch" | "launch" | "post-launch";
export type TaskType = "hook" | "email" | "pitch" | "social" | "mockup" | "video" | "review" | "other" | "landing" | "arc";

export interface CampaignTask {
  id: string;
  phase: CampaignPhase;
  title: string;
  description: string;
  daysFromLaunch: number;
  completed: boolean;
  type: TaskType;
  content?: string;
}

export interface CalendarEntry {
  date: string;
  tasks: CalendarTask[];
}

export interface CalendarTask {
  taskId: string;
  platform?: string;
  time?: string;
}

export interface Campaign {
  id: string;
  bookTitle: string;
  launchDate: string;
  createdAt: string;
  tasks: CampaignTask[];
  notes: string;
}

const STORAGE_KEY = "inkreach_campaign";

const DEFAULT_TASKS: CampaignTask[] = [
  { id: "list-build", phase: "pre-launch", title: "Build email list", description: "Set up landing page and start collecting emails", daysFromLaunch: -60, completed: false, type: "landing" },
  { id: "arc-outreach", phase: "pre-launch", title: "ARC reviewer outreach", description: "Send ARC requests to beta readers and influencers", daysFromLaunch: -45, completed: false, type: "arc" },
  { id: "social-tease", phase: "pre-launch", title: "Start social media teasing", description: "Post hooks, tropes, and snippets to build anticipation", daysFromLaunch: -30, completed: false, type: "hook" },
  { id: "generate-hooks", phase: "pre-launch", title: "Generate TikTok & IG hooks", description: "Create scroll-stopping video concepts", daysFromLaunch: -21, completed: false, type: "hook" },
  { id: "cover-reveal", phase: "pre-launch", title: "Cover reveal campaign", description: "Post cover reveal across all platforms", daysFromLaunch: -21, completed: false, type: "social" },
  { id: "generate-email", phase: "pre-launch", title: "Generate email sequence", description: "Create teaser, launch, and social proof emails", daysFromLaunch: -18, completed: false, type: "email" },
  { id: "generate-pitch", phase: "pre-launch", title: "Generate influencer pitches", description: "Create personalized outreach messages", daysFromLaunch: -18, completed: false, type: "pitch" },
  { id: "generate-mockup", phase: "pre-launch", title: "Create book mockups", description: "Generate 3D mockups and ad creatives", daysFromLaunch: -14, completed: false, type: "mockup" },
  { id: "generate-video", phase: "pre-launch", title: "Create book trailer", description: "Generate AI video trailer", daysFromLaunch: -14, completed: false, type: "video" },
  { id: "email-teaser-send", phase: "launch", title: "Send teaser email", description: "EMAIL 1 — Send to entire list (T-14 days)", daysFromLaunch: -14, completed: false, type: "email" },
  { id: "social-blitz-start", phase: "launch", title: "Launch week social blitz", description: "Schedule daily posts across all platforms", daysFromLaunch: -7, completed: false, type: "social" },
  { id: "email-launch-send", phase: "launch", title: "Send launch day email", description: "EMAIL 2 — Launch blast with buy links", daysFromLaunch: 0, completed: false, type: "email" },
  { id: "launch-posts", phase: "launch", title: "Launch day social posts", description: "Coordinated launch posts on all platforms", daysFromLaunch: 0, completed: false, type: "social" },
  { id: "influencer-go-live", phase: "launch", title: "Influencer posts go live", description: "Coordinate influencer review/post timing", daysFromLaunch: 0, completed: false, type: "pitch" },
  { id: "email-proof-send", phase: "post-launch", title: "Send social proof email", description: "EMAIL 3 — Share reader reactions, ask for reviews", daysFromLaunch: 7, completed: false, type: "email" },
  { id: "review-push", phase: "post-launch", title: "Review reminder campaign", description: "Follow up with readers for Amazon/Goodreads reviews", daysFromLaunch: 7, completed: false, type: "review" },
  { id: "sustained-content", phase: "post-launch", title: "Sustained social content", description: "Continue posting quotes, character content, memes", daysFromLaunch: 14, completed: false, type: "social" },
];

export function getCampaign(): Campaign {
  if (typeof window === "undefined") return createDefault();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return createDefault();
    }
  }
  return createDefault();
}

export function createDefault(): Campaign {
  return {
    id: "campaign-1",
    bookTitle: "",
    launchDate: "",
    createdAt: new Date().toISOString(),
    tasks: DEFAULT_TASKS.map((t) => ({ ...t })),
    notes: "",
  };
}

export function saveCampaign(campaign: Campaign): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
  }
}

export function toggleTask(campaignId: string, taskId: string): Campaign {
  const campaign = getCampaign();
  const task = campaign.tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveCampaign(campaign);
  }
  return campaign;
}

export function getCalendarEntries(campaign: Campaign): CalendarEntry[] {
  if (!campaign.launchDate) return [];

  const launch = new Date(campaign.launchDate);
  const entries: CalendarEntry[] = [];

  for (const task of campaign.tasks) {
    const date = new Date(launch);
    date.setDate(date.getDate() + task.daysFromLaunch);
    const dateStr = date.toISOString().split("T")[0];
    let entry = entries.find((e) => e.date === dateStr);
    if (!entry) {
      entry = { date: dateStr, tasks: [] };
      entries.push(entry);
    }
    entry.tasks.push({ taskId: task.id });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

export function getPhaseProgress(campaign: Campaign, phase: CampaignPhase): { total: number; completed: number } {
  const tasks = campaign.tasks.filter((t) => t.phase === phase);
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
  };
}

export function getOverallProgress(campaign: Campaign): { total: number; completed: number } {
  return {
    total: campaign.tasks.length,
    completed: campaign.tasks.filter((t) => t.completed).length,
  };
}
