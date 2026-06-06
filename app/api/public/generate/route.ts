const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || "";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const GENERATORS: Record<string, string> = {
  hooks: "/api/generate-hooks",
  email: "/api/generate-email",
  pitch: "/api/generate-pitch",
  social: "/api/generate-social",
};

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (PUBLIC_API_KEY && apiKey !== PUBLIC_API_KEY) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Rate limit exceeded. Max 30 req/min." }, { status: 429 });
  }

  try {
    const { type, ...payload } = await req.json();

    if (!type || !GENERATORS[type]) {
      return Response.json({ error: "Invalid type. Use: hooks, email, pitch, social" }, { status: 400 });
    }

    const res = await fetch(new URL(GENERATORS[type], req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
