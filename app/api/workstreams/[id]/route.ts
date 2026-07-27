import {
  isAllowedWorkstreamTransition,
  workstreamDeleteSchema,
  workstreamUpdateSchema,
} from "@/lib/workstreams";
import { getAuthenticatedSupabase, safeError } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;
    const { data, error } = await auth.client
      .from("workstreams").select("*").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Workstream not found." }, { status: 404 });
    const [{ data: entries, error: entriesError }, { count, error: countError }] = await Promise.all([
      auth.client.from("entries").select("*").eq("user_id", auth.user.id).eq("workstream_id", id)
        .is("archived_at", null).order("created_at", { ascending: false }),
      auth.client.from("entries").select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id).eq("workstream_id", id),
    ]);
    if (entriesError) throw entriesError;
    if (countError) throw countError;
    return Response.json({ workstream: data, entries, related_entry_count: count ?? 0 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;
    const parsed = workstreamUpdateSchema.safeParse(await request.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return Response.json({ error: "Invalid workstream update." }, { status: 400 });
    }
    const { data: current, error: currentError } = await auth.client
      .from("workstreams").select("status").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return Response.json({ error: "Workstream not found." }, { status: 404 });
    if (parsed.data.status && !isAllowedWorkstreamTransition(current.status, parsed.data.status)) {
      return Response.json({ error: "That workstream-status transition is not allowed." }, { status: 400 });
    }
    const { data, error } = await auth.client
      .from("workstreams").update(parsed.data).eq("id", id).eq("user_id", auth.user.id)
      .select("*").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Workstream not found." }, { status: 404 });
    return Response.json({ workstream: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;
    const parsed = workstreamDeleteSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Explicit deletion confirmation is required." }, { status: 400 });
    const { data: workstream, error: workstreamError } = await auth.client
      .from("workstreams").select("id, name").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (workstreamError) throw workstreamError;
    if (!workstream) return Response.json({ error: "Workstream not found." }, { status: 404 });
    const { count, error: countError } = await auth.client
      .from("entries").select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id).eq("workstream_id", id);
    if (countError) throw countError;
    if (parsed.data.confirmation_name !== workstream.name || parsed.data.related_entry_count !== (count ?? 0)) {
      return Response.json({ error: "The workstream name or related-entry count changed. Review the confirmation again." }, { status: 409 });
    }
    const { data, error } = await auth.client
      .from("workstreams").delete().eq("id", id).eq("user_id", auth.user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Workstream not found." }, { status: 404 });
    return Response.json({ deleted: true, preserved_entries: count ?? 0 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
