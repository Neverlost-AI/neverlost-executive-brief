import { entryUpdateSchema } from "@/lib/entries";
import {
  getAuthenticatedSupabase,
  safeError,
} from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;

    const { data, error } = await auth.client
      .from("entries")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Entry not found." }, { status: 404 });
    return Response.json({ entry: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;

    const parsed = entryUpdateSchema.safeParse(await request.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return Response.json(
        { error: "Invalid update.", issues: parsed.success ? {} : parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { data, error } = await auth.client
      .from("entries")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Entry not found." }, { status: 404 });
    return Response.json({ entry: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;

    const { data, error } = await auth.client
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Entry not found." }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
