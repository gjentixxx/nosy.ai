export type Candidate = {
  category: string;
  experienceYears: number;
  resumeText: string;
  region: string;
};

export type JobPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  publishedAt: string;
  description: string;
  contactEmail: string | null;
};

export type MatchedJob = JobPosting & {
  matchReason: string;
  matchTier: "primary" | "secondary";
  matchedSkills: string[];
};

type SecondaryRole = { query: string; title: RegExp; evidence: RegExp };
type RoleFamily = { name: string; primaryQueries: string[]; primaryTitle: RegExp; secondary: SecondaryRole[] };

const skillPatterns: Array<[string, RegExp]> = [
  ["Figma", /\bfigma\b/i],
  ["user research", /\b(user research|research interviews|user interviews)\b/i],
  ["usability testing", /\b(usability testing|user testing)\b/i],
  ["wireframing", /\b(wireframes?|wireframing)\b/i],
  ["prototyping", /\b(prototypes?|prototyping)\b/i],
  ["design systems", /\bdesign systems?\b/i],
  ["interaction design", /\binteraction design\b/i],
  ["visual design", /\b(visual design|graphic design|art direction)\b/i],
  ["web design", /\b(web design|website design|websites?)\b/i],
  ["landing pages", /\blanding pages?\b/i],
  ["branding", /\b(branding|brand identity|brand design)\b/i],
  ["typography", /\btypography\b/i],
  ["accessibility", /\b(accessibility|wcag|a11y)\b/i],
  ["HTML/CSS", /\b(html|css)\b/i],
  ["React", /\breact(?:\.js)?\b/i],
  ["product design", /\bproduct design\b/i],
  ["mobile design", /\b(mobile app design|mobile design|ios design|android design)\b/i],
  ["illustration", /\billustrat(?:ion|or)\b/i],
  ["motion design", /\b(motion design|animation|after effects)\b/i],
  ["Shopify", /\bshopify\b/i],
  ["TypeScript", /\btypescript\b/i],
  ["Python", /\bpython\b/i],
  ["SQL", /\bsql\b/i],
  ["SEO", /\bseo\b/i]
];

const designFamily: RoleFamily = {
  name: "UI/UX design",
  primaryQueries: ["UI UX Designer", "UX Designer", "Product Designer"],
  primaryTitle: /\b(ui\s*[/&-]?\s*ux|ux\s*[/&-]?\s*ui|ux designer|ui designer|product designer|interaction designer|user experience designer|user interface designer)\b/i,
  secondary: [
    { query: "Visual Designer", title: /\bvisual designer\b/i, evidence: /\b(visual design|graphic design|art direction|branding|typography)\b/i },
    { query: "Web Designer", title: /\b(web designer|website designer|webflow designer)\b/i, evidence: /\b(web design|website design|websites?|webflow|html|css)\b/i },
    { query: "Landing Page Designer", title: /\b(landing page designer|conversion designer|marketing website designer)\b/i, evidence: /\b(landing pages?|web design|website design)\b/i },
    { query: "Digital Designer", title: /\bdigital designer\b/i, evidence: /\b(visual design|web design|branding|graphic design)\b/i }
  ]
};

const engineeringFamily: RoleFamily = {
  name: "software engineering",
  primaryQueries: ["Software Engineer", "Frontend Developer", "Web Developer"],
  primaryTitle: /\b(software engineer|software developer|front.?end (engineer|developer)|web developer|full.?stack (engineer|developer))\b/i,
  secondary: []
};

const marketingFamily: RoleFamily = {
  name: "marketing",
  primaryQueries: ["Marketing Specialist", "Growth Marketing"],
  primaryTitle: /\b(marketing (specialist|manager|designer)|growth market(?:er|ing)|digital market(?:er|ing))\b/i,
  secondary: []
};

export function roleFamily(category: string): RoleFamily {
  if (/ui|ux|design/i.test(category)) return designFamily;
  if (/engineer|developer/i.test(category)) return engineeringFamily;
  if (/marketing/i.test(category)) return marketingFamily;
  const phrase = category.trim().replace(/[^a-z\s/-]/gi, "").slice(0, 60) || "remote jobs";
  return { name: phrase, primaryQueries: [phrase], primaryTitle: new RegExp(phrase.split(/\s+/).map(escapeRegExp).join("\\s+"), "i"), secondary: [] };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function skillsIn(text: string) {
  return skillPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function inferRegion(text: string) {
  if (/belgrade|serbia|balkans|european union|\beurope\b/i.test(text)) return "Europe";
  if (/united states|\busa\b/i.test(text)) return "United States";
  if (/\bcanada\b/i.test(text)) return "Canada";
  if (/united kingdom|\buk\b/i.test(text)) return "United Kingdom";
  return "Worldwide";
}

function locationEligible(location: string, region: string) {
  const value = location.toLowerCase();
  if (/worldwide|anywhere|global|all countries|international/.test(value)) return true;
  if (!value || value === "remote") return false;
  if (region === "Europe") return /europe|emea|european union|\beu\b|serbia|balkan/.test(value) && !/except (serbia|europe|eu)/.test(value);
  if (region === "United States") return /united states|\busa?\b|north america/.test(value);
  if (region === "Canada") return /canada|north america/.test(value);
  if (region === "United Kingdom") return /united kingdom|\buk\b|britain/.test(value);
  return false;
}

function recent(publishedAt: string, now: Date) {
  const time = Date.parse(publishedAt);
  const age = now.getTime() - time;
  return Number.isFinite(time) && age >= -86400000 && age <= 30 * 86400000;
}

function experienceEligible(job: JobPosting, years: number) {
  if (/\b(head of|director|principal|staff|lead)\b/i.test(job.title) && years < 7) return false;
  if (/\bsenior\b/i.test(job.title) && years < 4) return false;
  const requirement = job.description.match(/(?:minimum of|at least|requires?|with)\s+(\d{1,2})\+?\s+years?\s+(?:of\s+)?(?:relevant\s+)?experience/i);
  return !requirement || years === 0 || years >= Number(requirement[1]);
}

export function matchJobs(jobs: JobPosting[], candidate: Candidate, tier: "primary" | "secondary", now = new Date()): MatchedJob[] {
  const family = roleFamily(candidate.category);
  const resumeSkills = skillsIn(candidate.resumeText);
  const seen = new Set<string>();
  return jobs.flatMap((job) => {
    if (seen.has(job.url)) return [];
    seen.add(job.url);
    const titleMatch = tier === "primary"
      ? family.primaryTitle.test(job.title)
      : family.secondary.some((role) => role.title.test(job.title) && role.evidence.test(candidate.resumeText));
    if (!titleMatch || !recent(job.publishedAt, now) || !locationEligible(job.location, candidate.region) || !experienceEligible(job, candidate.experienceYears)) return [];
    if (/\b(intern|internship|developer|engineer|sales|recruiter|marketing|copywriter)\b/i.test(job.title) && family === designFamily) return [];
    const jobSkills = skillsIn(job.description);
    const matchedSkills = resumeSkills.filter((skill) => jobSkills.includes(skill));
    if (resumeSkills.length && jobSkills.length && !matchedSkills.length) return [];
    const matchReason = matchedSkills.length
      ? `${tier === "primary" ? "Role" : "Related role"} matches your ${family.name} background and ${matchedSkills.slice(0, 3).join(", ")}.`
      : `${tier === "primary" ? "Role" : "Related role"} matches your ${family.name} background; review the full requirements.`;
    return [{ ...job, matchTier: tier, matchedSkills, matchReason }];
  }).sort((a, b) => b.matchedSkills.length - a.matchedSkills.length || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
