import { z } from "zod";
import { agentUserId } from "@/lib/job-agent/identity";
import { loadAgentState, saveAgentState } from "@/lib/job-agent/store";

export const runtime = "nodejs";

const stateSchema = z.object({
  fileName: z.string().max(120),
  resumeText: z.string().max(60000),
  category: z.string().max(100),
  experienceYears: z.number().int().min(0).max(40),
  jobType: z.string().max(50),
  region: z.enum(["Worldwide", "Europe", "United States", "Canada", "United Kingdom"]),
  hired: z.boolean(),
  aiConsent: z.boolean(),
  savedJobs: z.array(z.string().max(200)).max(100),
  drafts: z.record(z.string(), z.object({ resume: z.string().max(60000), coverLetter: z.string().max(20000), email: z.string().max(10000), subject: z.string().max(300).optional() })).refine((value) => Object.keys(value).length <= 100)
});

export async function GET() {
  const userId = await agentUserId();
  if (!userId) return Response.json({ error: "Sign in with Google to continue." }, { status: 401 });
  try {
    return Response.json({ state: await loadAgentState(userId) });
  } catch {
    return Response.json({ error: "Could not load your saved work." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await agentUserId();
  if (!userId) return Response.json({ error: "Sign in with Google to continue." }, { status: 401 });
  const parsed = stateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid workspace state." }, { status: 400 });
  try {
    await saveAgentState(userId, parsed.data);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not save your work." }, { status: 500 });
  }
}
