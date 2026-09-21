import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function agentUserId() {
  if (!hasSupabaseConfig()) return "local-preview";
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user?.id || null;
}
