"use server";

import { redirect } from "next/navigation";
import { absoluteUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export async function signInToJobAgent() {
  if (!hasSupabaseConfig()) redirect("/agent-builder?error=google-unavailable");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: absoluteUrl("/auth/callback?next=/agent-builder") }
  });
  if (error || !data.url) redirect("/agent-builder?error=google-unavailable");
  redirect(data.url);
}
