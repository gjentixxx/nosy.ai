import assert from "node:assert/strict";
import test from "node:test";
import { matchJobs } from "./matching.ts";

const now = new Date("2026-09-21T12:00:00Z");
const candidate = {
  category: "UI/UX Designer",
  experienceYears: 5,
  resumeText: "UI/UX designer with 5 years of experience in Figma, wireframing, prototyping, web design and landing pages. Based in Belgrade, Serbia.",
  region: "Europe"
};

function job(overrides = {}) {
  return {
    id: "one",
    title: "UI/UX Designer",
    company: "Example",
    location: "Europe",
    url: "https://example.com/jobs/one",
    publishedAt: "2026-09-18T10:00:00Z",
    description: "Design interfaces in Figma and create prototypes.",
    contactEmail: null,
    ...overrides
  };
}

test("keeps a fresh, eligible UI/UX role with resume evidence", () => {
  const matches = matchJobs([job()], candidate, "primary", now);
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].matchedSkills, ["Figma", "prototyping"]);
});

test("rejects unrelated titles even when description mentions designers", () => {
  const jobs = [
    job({ title: "Senior Shopify Developer", url: "https://example.com/developer" }),
    job({ title: "Inside Sales Contractor", url: "https://example.com/sales" }),
    job({ title: "Remote Office Assistant", url: "https://example.com/assistant" })
  ];
  assert.equal(matchJobs(jobs, candidate, "primary", now).length, 0);
});

test("rejects stale, geographically restricted, and over-senior posts", () => {
  const jobs = [
    job({ publishedAt: "2026-07-01T10:00:00Z", url: "https://example.com/stale" }),
    job({ location: "USA only", url: "https://example.com/us" }),
    job({ title: "Lead UI/UX Designer", url: "https://example.com/lead" })
  ];
  assert.equal(matchJobs(jobs, candidate, "primary", now).length, 0);
});

test("permits related web design only when the resume supports it", () => {
  const related = job({ title: "Web Designer", description: "Design marketing websites and landing pages.", url: "https://example.com/web" });
  assert.equal(matchJobs([related], candidate, "secondary", now).length, 1);
  assert.equal(matchJobs([related], { ...candidate, resumeText: "UI/UX designer with Figma and user research." }, "secondary", now).length, 0);
});

test("rejects a role whose listed capabilities do not overlap the resume", () => {
  const unrelatedSkills = job({ description: "Must use Shopify and TypeScript to build storefronts." });
  assert.equal(matchJobs([unrelatedSkills], candidate, "primary", now).length, 0);
});
