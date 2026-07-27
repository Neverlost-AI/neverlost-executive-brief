import { getAuthenticatedSupabase, safeError } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { data, error } = await auth.client
      .from("user_preferences").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (error) throw error;
    return Response.json({ preference: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const now = new Date().toISOString();
    const { data, error } = await auth.client
      .from("user_preferences")
      .upsert({ user_id: auth.user.id, last_weekly_review_completed_at: now }, { onConflict: "user_id" })
      .select("*").single();
    if (error) throw error;
    return Response.json({ preference: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
