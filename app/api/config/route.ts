import { getSupabaseConfig } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { url, anonKey } = getSupabaseConfig();
    return Response.json({ url, anonKey });
  } catch {
    return Response.json(
      { error: "This review environment is not configured." },
      { status: 503 },
    );
  }
}
