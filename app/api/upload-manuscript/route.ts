export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return Response.json({ error: "File too large. Max 10MB." }, { status: 400 });

    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".txt")) {
      text = await file.text();
    } else if (name.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        pages.push(pageText);
      }
      text = pages
        .join("\n\n")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n");
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
        .join("\n");
    } else {
      return Response.json({ error: "Unsupported format. Please upload .txt, .pdf, or .docx" }, { status: 400 });
    }

    if (text.length < 100) return Response.json({ error: "File appears to be empty or unreadable." }, { status: 400 });

    const wordCount = text.split(/\s+/).length;
    const preview = text.slice(0, 500);

    return Response.json({ text: text.slice(0, 100000), wordCount, preview, fileName: file.name });
  } catch {
    return Response.json({ error: "Failed to process file" }, { status: 500 });
  }
}
