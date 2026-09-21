import assert from "node:assert/strict";
import test from "node:test";
import { localApplicationDraft } from "./drafting.ts";

test("prepares all three editable drafts and a subject from resume evidence", () => {
  const state = {
    fileName: "resume.txt",
    resumeText: "Alex Candidate\nUI/UX Designer\nCreated wireframes and prototypes in Figma for mobile applications.\nBuilt a design system used across two product teams.",
    category: "UI/UX Designer",
    experienceYears: 5,
    jobType: "Remote",
    region: "Europe",
    hired: true,
    aiConsent: false,
    savedJobs: [],
    drafts: {}
  };
  const job = {
    id: "one", title: "UI/UX Designer", company: "Acme", location: "Europe", url: "https://example.com/job",
    publishedAt: "2026-09-20T00:00:00Z", description: "Create Figma prototypes and design systems.", contactEmail: null
  };
  const draft = localApplicationDraft(job, state);
  assert.match(draft.resume, /Created wireframes and prototypes in Figma/);
  assert.match(draft.coverLetter, /Acme hiring team/);
  assert.match(draft.email, /UI\/UX Designer opening/);
  assert.match(draft.subject, /Application for UI\/UX Designer at Acme/);
  assert.doesNotMatch(draft.email, /attached/i);
});
