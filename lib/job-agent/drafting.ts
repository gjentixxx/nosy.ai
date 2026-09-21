import type { JobPosting } from "./matching";
import type { AgentState } from "./store";

export type ApplicationDraft = { resume: string; coverLetter: string; email: string; subject: string };

function evidenceLines(resumeText: string, job: JobPosting) {
  const terms = new Set(`${job.title} ${job.description}`.toLowerCase().match(/[a-z]{5,}/g) || []);
  return resumeText.split(/\n|\u2022|•/).map((line) => line.trim()).filter((line) =>
    line.length >= 28 && line.length <= 230 && !/@|https?:|\+\d{5,}/.test(line)
  ).map((line) => ({ line, score: (line.toLowerCase().match(/[a-z]{5,}/g) || []).filter((word) => terms.has(word)).length }))
    .sort((a, b) => b.score - a.score).slice(0, 3).map(({ line }) => line);
}

export function localApplicationDraft(job: JobPosting, state: AgentState): ApplicationDraft {
  const evidence = evidenceLines(state.resumeText, job);
  const facts = evidence.length ? evidence : [state.resumeText.replace(/\s+/g, " ").trim().slice(0, 240)];
  const bullets = facts.map((line) => `- ${line}`).join("\n");
  const subject = `Application for ${job.title} at ${job.company}`;
  return {
    resume: `TARGET ROLE\n${job.title} | ${job.company}\n\nRELEVANT EXPERIENCE FROM YOUR RESUME\n${bullets}\n\nORIGINAL RESUME\n${state.resumeText.trim()}`.slice(0, 60000),
    coverLetter: `Dear ${job.company} hiring team,\n\nI am applying for the ${job.title} position. My resume includes experience relevant to this role:\n\n${bullets}\n\nI would welcome the chance to discuss how this background could support your team.\n\nBest regards,\n[Your name]`,
    email: `Hello ${job.company} hiring team,\n\nI am writing about the ${job.title} opening. My background includes ${state.category.toLowerCase()} work, and I would welcome the opportunity to discuss this role.\n\nI can share my resume and cover letter through your preferred application process.\n\nBest,\n[Your name]`,
    subject
  };
}
