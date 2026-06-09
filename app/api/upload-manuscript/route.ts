import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await createServerSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

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
      const { getDocumentProxy, extractText } = await import("unpdf");
      const uint8 = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(uint8);
      const { text: raw } = await extractText(pdf, { mergePages: true });
      text = raw
        .split("\n")
        .map((l: string) => l.trim())
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
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message || "Unknown error";
    console.error("Upload error:", msg);
    return Response.json({ error: `Failed to process file: ${msg}` }, { status: 500 });
  }
}
