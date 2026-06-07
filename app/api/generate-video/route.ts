import { requireSubscription } from "@/lib/check-subscription";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const sub = await requireSubscription();
  if (!sub.allowed) {
    return Response.json({ error: sub.error }, { status: sub.status });
  }

  const rate = await checkRateLimit(sub.user!.id);
  if (!rate.allowed) {
    return Response.json({ error: rate.error }, { status: 429 });
  }

  const { prompt, aspectRatio, duration } = await req.json();

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const generateRes = await fetch("https://seedanceapi.org/v2/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio: aspectRatio || "16:9",
        duration: duration || 5,
        model: "seedance-2.0",
      }),
    });

    const genData = await generateRes.json();

    if (!generateRes.ok) {
      if (genData.code === 402) {
        return Response.json(
          { error: "⚠️ No Seedance credits. Check your dashboard at seedanceapi.org" },
          { status: 402 }
        );
      }
      return Response.json(
        { error: `⚠️ ${genData.message || "Generation failed"}` },
        { status: generateRes.status }
      );
    }

    const taskId = genData.task_id || genData.id;
    if (!taskId) {
      return Response.json(
        { error: "⚠️ No task ID returned" },
        { status: 500 }
      );
    }

    let videoUrl: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusRes = await fetch(
        `https://seedanceapi.org/v2/status?task_id=${taskId}`,
        {
          headers: { Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}` },
        }
      );
      const statusData = await statusRes.json();

      if (statusData.status === "completed" || statusData.status === "done") {
        videoUrl = statusData.video_url || statusData.url || statusData.result;
        break;
      }
      if (statusData.status === "failed") {
        return Response.json(
          { error: "⚠️ Video generation failed" },
          { status: 500 }
        );
      }
    }

    if (!videoUrl) {
      return Response.json(
        { error: "⚠️ Generation timed out. Try again." },
        { status: 500 }
      );
    }

    return Response.json({ videoUrl });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("VIDEO GEN ERROR:", err.message);
    return Response.json(
      { error: `⚠️ ${err.message || "Connection failed"}` },
      { status: 500 }
    );
  }
}
