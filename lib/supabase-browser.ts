"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export async function getBrowserSupabase() {
  if (browserClient) return browserClient;
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("This review environment is not configured.");
  const config = (await response.json()) as { url: string; anonKey: string };
  browserClient = createClient(config.url, config.anonKey);
  return browserClient;
}
