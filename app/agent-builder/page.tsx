import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AgentBuilderApp } from "./ui";
import { gateCookieName, hasGateAccess } from "@/lib/job-agent/access";
import { hasGoogleAuthConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Job Agent",
  description: "Your private resume-based job search workspace."
};

export default async function AgentBuilderPage() {
  const unlocked = hasGateAccess((await cookies()).get(gateCookieName)?.value);
  let signedIn = false;
  if (unlocked && hasGoogleAuthConfig()) {
    const supabase = await createClient();
    signedIn = Boolean((await supabase.auth.getUser()).data.user);
  }
  return <AgentBuilderApp unlocked={unlocked} googleConfigured={hasGoogleAuthConfig()} signedIn={signedIn} aiConfigured={Boolean(process.env.GEMINI_API_KEY)} />;
}
