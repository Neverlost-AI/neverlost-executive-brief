import { getAuthenticatedSupabase, safeError } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const [{ data: entries, error: entriesError }, { data: workstreams, error: workstreamsError }] =
      await Promise.all([
        auth.client.from("entries").select("*").eq("user_id", auth.user.id).is("archived_at", null),
        auth.client.from("workstreams").select("*").eq("user_id", auth.user.id),
      ]);
    if (entriesError) throw entriesError;
    if (workstreamsError) throw workstreamsError;
    return Response.json({ entries, workstreams, server_now: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
