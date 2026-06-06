export function buildEmailHtml(subject: string, body: string, authorName: string, bookTitle: string): string {
  const paragraphs = body
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => `<p style="margin: 0 0 14px 0; line-height: 1.7;">${l}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f4f4f4; font-family: Georgia, serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 30px 35px 0 35px;">
              <h1 style="margin: 0 0 6px 0; font-size: 22px; color: #1a1a1a;">${subject}</h1>
              <hr style="border: none; border-top: 2px solid #10B981; margin: 20px 0;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 35px 20px 35px; font-size: 16px; color: #333;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 35px; background: #f9f9f9; border-top: 1px solid #eee;">
              <p style="margin:0; font-size: 13px; color: #888;">
                — ${authorName}<br>
                <em>${bookTitle}</em>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ParsedEmail {
  subject: string;
  previewText: string;
  body: string;
  label: string;
}

export function parseEmailSequence(text: string): ParsedEmail[] {
  const blocks = text.split(/(?=EMAIL \d)/).filter(Boolean);
  return blocks.map((block) => {
    const raw = block.match(/Subject Line:\s*(.+)/i)?.[1] || "No subject";
    const subject = raw.replace(/\*\*/g, "").trim();
    const previewText = (block.match(/Preview Text:\s*(.+)/i)?.[1] || "").replace(/\*\*/g, "").trim();
    const body = block
      .replace(/EMAIL \d\s*—\s*.+/i, "")
      .replace(/Subject Line:\s*.+/i, "")
      .replace(/Preview Text:\s*.+/i, "")
      .replace(/Body:\s*/i, "")
      .trim();
    const label = block.match(/EMAIL \d\s*—\s*(.+)/i)?.[1] || subject;
    return { subject, previewText, body, label };
  });
}
