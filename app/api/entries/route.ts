import { entryInputSchema } from "@/lib/entries";
import {
  getAuthenticatedSupabase,
  safeError,
} from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });

    const scope = new URL(request.url).searchParams.get("scope");
    let query = auth.client
      .from("entries")
      .select("*")
      .eq("user_id", auth.user.id);

    query =
      scope === "archive"
        ? query.not("archived_at", "is", null)
        : query.is("archived_at", null);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw error;
    return Response.json({ entries: data });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });

    const parsed = entryInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid entry.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { data, error } = await auth.client
      .from("entries")
      .insert({ ...parsed.data, user_id: auth.user.id })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ entry: data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
