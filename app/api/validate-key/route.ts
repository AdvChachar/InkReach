export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key || typeof key !== "string") {
      return Response.json({ valid: false, error: "No key provided" }, { status: 400 });
    }

    const trimmed = key.trim();

    const staticKey = process.env.LICENSE_KEY;
    if (staticKey && trimmed === staticKey) {
      return Response.json({ valid: true });
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      return Response.json({ valid: false, error: "Invalid license key" }, { status: 401 });
    }

    const body = new URLSearchParams({ license_key: trimmed });

    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ valid: false, error: data.error || "Validation failed" }, { status: res.status });
    }

    if (data.valid && data.license_key?.status === "active") {
      return Response.json({ valid: true });
    }

    return Response.json({ valid: false, error: "License key is not active" }, { status: 401 });
  } catch {
    return Response.json({ valid: false, error: "Invalid request" }, { status: 400 });
  }
}
