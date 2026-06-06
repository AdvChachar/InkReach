import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, subject, html, from, campaign } = await req.json();

    if (!to || !subject || !html) {
      return Response.json({ error: "Missing required fields: to, subject, html" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: from || "InkReach <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      tags: campaign ? [{ name: "campaign", value: campaign }] : undefined,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, id: data?.id });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return Response.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
