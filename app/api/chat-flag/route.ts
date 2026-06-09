import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await createServerSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, characterName, originalResponse, userFeedback, suggestedResponse } = await req.json();

  if (!bookId || !originalResponse || !userFeedback) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase.from("chat_flags").insert({
    user_id: user.id,
    book_id: bookId,
    character_name: characterName || "",
    original_response: originalResponse,
    user_feedback: userFeedback,
    suggested_response: suggestedResponse || "",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
