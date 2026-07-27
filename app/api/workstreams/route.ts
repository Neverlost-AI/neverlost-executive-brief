import { workstreamInputSchema } from "@/lib/workstreams";
import { getAuthenticatedSupabase, safeError } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { data, error } = await auth.client
      .from("workstreams")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return Response.json({ workstreams: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = workstreamInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid workstream.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { data, error } = await auth.client
      .from("workstreams")
      .insert({ ...parsed.data, user_id: auth.user.id })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ workstream: data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
