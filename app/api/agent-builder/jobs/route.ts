import { agentUserId } from "@/lib/job-agent/identity";
import { loadAgentState } from "@/lib/job-agent/store";
import { matchJobs, roleFamily, type JobPosting } from "@/lib/job-agent/matching";

export const runtime = "nodejs";

type RemoteJob = {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  url: string;
  publication_date: string;
  description: string;
};

type ArbeitnowJob = {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  url: string;
  created_at: number;
  description: string;
};

function contactEmail(description: string) {
  const mailto = description.match(/(?:apply|send your (?:resume|cv))[^\n]{0,160}?mailto:([\w.+%-]+@[\w.-]+\.[a-z]{2,})/i);
  const application = description.match(/(?:apply|send your (?:resume|cv)|email your (?:resume|cv))[^.\n]{0,120}?([\w.+%-]+@[\w.-]+\.[a-z]{2,})/i);
  return (mailto || application)?.[1] || null;
}

function cleanDescription(description: string) {
  return description.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 5000);
}

async function remotiveJobs(queries: string[]) {
  const results = await Promise.allSettled(queries.map(async (query) => {
    const url = new URL("https://remotive.com/api/remote-jobs");
    url.searchParams.set("search", query);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("Remotive unavailable");
    const data = await response.json() as { jobs?: RemoteJob[] };
    return (data.jobs || []).map((job): JobPosting => ({
      id: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || "Remote",
      url: job.url,
      publishedAt: job.publication_date,
      description: cleanDescription(String(job.description || "")),
      contactEmail: contactEmail(String(job.description || ""))
    }));
  }));
  return {
    available: results.some((result) => result.status === "fulfilled"),
    jobs: results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  };
}

async function arbeitnowJobs() {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api", { next: { revalidate: 900 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Arbeitnow unavailable");
  const data = await response.json() as { data?: ArbeitnowJob[] };
  return (data.data || []).filter((job) => job.remote).map((job): JobPosting => ({
    id: `arbeitnow-${job.slug}`,
    title: job.title,
    company: job.company_name,
    location: job.location || "Remote",
    url: job.url,
    publishedAt: new Date(job.created_at * 1000).toISOString(),
    description: cleanDescription(String(job.description || "")),
    contactEmail: contactEmail(String(job.description || ""))
  }));
}

export async function GET() {
  const userId = await agentUserId();
  if (!userId) return Response.json({ error: "Sign in with Google to continue." }, { status: 401 });

  try {
    const state = await loadAgentState(userId);
    if (!state.resumeText) return Response.json({ error: "Upload a resume first." }, { status: 400 });
    const candidate = {
      category: state.category,
      experienceYears: state.experienceYears,
      resumeText: state.resumeText,
      region: state.region || "Worldwide"
    };
    const family = roleFamily(candidate.category);
    const [primaryRemotive, arbeitnowResult] = await Promise.all([
      remotiveJobs(family.primaryQueries),
      arbeitnowJobs().then((jobs) => ({ jobs, available: true })).catch(() => ({ jobs: [] as JobPosting[], available: false }))
    ]);
    const primaryMatches = matchJobs(primaryRemotive.jobs, candidate, "primary");
    if (primaryMatches.length) return Response.json({ jobs: primaryMatches.slice(0, 12), source: "Remotive", tier: "primary" });

    const arbeitnow = arbeitnowResult.jobs;
    const arbeitnowAvailable = arbeitnowResult.available;
    const otherPrimary = matchJobs(arbeitnow, candidate, "primary");
    if (otherPrimary.length) return Response.json({ jobs: otherPrimary.slice(0, 12), source: "Arbeitnow", tier: "primary" });

    if (family.secondary.length) {
      const secondaryRemotive = await remotiveJobs(family.secondary.map((role) => role.query));
      const secondaryMatches = matchJobs([...secondaryRemotive.jobs, ...arbeitnow], candidate, "secondary");
      if (secondaryMatches.length) return Response.json({ jobs: secondaryMatches.slice(0, 12), source: "Remotive / Arbeitnow", tier: "secondary" });
      if (!primaryRemotive.available && !arbeitnowAvailable && !secondaryRemotive.available) {
        return Response.json({ error: "Job sources are temporarily unavailable." }, { status: 503 });
      }
    } else if (!primaryRemotive.available && !arbeitnowAvailable) {
      return Response.json({ error: "Job sources are temporarily unavailable." }, { status: 503 });
    }

    return Response.json({ jobs: [], tier: "none", source: "Remotive / Arbeitnow" });
  } catch {
    return Response.json({ error: "Could not search jobs right now." }, { status: 500 });
  }
}
