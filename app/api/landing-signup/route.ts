export async function POST(req: Request) {
  try {
    const { email, name, bookTitle } = await req.json();

    if (!email || !email.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey !== "re_xxxxxxxxxxxx") {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "InkReach <onboarding@resend.dev>",
            to: email,
            subject: `Thanks for your interest in ${bookTitle || "our next release"}!`,
            html: `<p>Hi ${name || "there"}!</p><p>Thanks for signing up. You'll be the first to know when <strong>${bookTitle || "the book"}</strong> launches.</p><p>Stay tuned!</p>`,
          }),
        });
      } catch {
        // Email notification is best-effort
      }
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
