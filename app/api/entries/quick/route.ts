import { deriveQuickCapture, quickCaptureSchema } from "@/lib/entries";
import { getAuthenticatedSupabase, safeError } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = quickCaptureSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Enter nonblank capture text." }, { status: 400 });
    }
    const values = deriveQuickCapture(parsed.data.content);
    const { data, error } = await auth.client
      .from("entries")
      .insert({ ...values, user_id: auth.user.id })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ entry: data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500 });
  }
}
