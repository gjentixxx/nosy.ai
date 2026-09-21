"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, Binoculars, Bookmark, Check, Clock3, Copy, FileText, LockKeyhole, Mail, PenLine, RefreshCw, Search, WandSparkles } from "lucide-react";
import { signInToJobAgent } from "./actions";
import type { AgentState } from "@/lib/job-agent/store";
import type { MatchedJob } from "@/lib/job-agent/matching";
import "./agent.css";

type Props = { unlocked: boolean; googleConfigured: boolean; signedIn: boolean; aiConfigured: boolean };

const initialState: AgentState = { fileName: "", resumeText: "", category: "", experienceYears: 0, jobType: "Remote", region: "Worldwide", hired: false, aiConsent: false, savedJobs: [], drafts: {} };

function Orbit({ active }: { active: boolean }) {
  return <div className={`agent-orbit ${active ? "agent-orbit-active" : ""}`} aria-label="Job agent searches, monitors, drafts emails, resumes, and cover letters">
    <div className="orbit-ring orbit-ring-outer" />
    <div className="orbit-ring orbit-ring-inner" />
    <div className="orbit-ring orbit-ring-core" />
    <div className="orbit-track orbit-track-outer">
      <div className="orbit-icon orbit-search" title="Search"><Search size={21} /></div>
      <div className="orbit-icon orbit-file" title="Resume"><FileText size={20} /></div>
      <div className="orbit-icon orbit-pencil" title="Cover letter"><PenLine size={20} /></div>
      <div className="orbit-icon orbit-mail" title="Email"><Mail size={20} /></div>
      <div className="orbit-icon orbit-bell" title="Monitor"><Bell size={20} /></div>
    </div>
    <div className="orbit-track orbit-track-inner">
      <div className="orbit-label orbit-jobs">Jobs</div>
      <div className="orbit-label orbit-cover">Cover letter</div>
      <div className="orbit-label orbit-resume">Resume</div>
      <div className="orbit-label orbit-email">Email</div>
      <div className="orbit-label orbit-monitor">Monitor</div>
    </div>
    <div className="orbit-center"><Binoculars size={29} strokeWidth={2.2} /></div>
  </div>;
}

export function AgentBuilderApp({ unlocked, googleConfigured, signedIn, aiConfigured }: Props) {
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [state, setState] = useState<AgentState>(initialState);
  const [loading, setLoading] = useState(unlocked && (!googleConfigured || signedIn));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);
  const [search, setSearch] = useState("");
  const [matchTier, setMatchTier] = useState<"primary" | "secondary" | "none">("none");
  const [draftTab, setDraftTab] = useState<"resume" | "coverLetter" | "email">("resume");
  const [drafting, setDrafting] = useState(false);
  const [draftEngine, setDraftEngine] = useState<"local" | "gemini">("local");
  const fileRef = useRef<HTMLInputElement>(null);
  const applicationRef = useRef<HTMLDivElement>(null);
  const draftRequestRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const fetchJobs = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/agent-builder/jobs");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not search jobs.");
      setJobs(data.jobs || []);
      setMatchTier(data.tier || "none");
      if (!data.jobs?.length) setMessage("No fresh roles meet your resume and location criteria right now. Try another region or check again later.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not search jobs.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked || (googleConfigured && !signedIn)) return;
    let cancelled = false;
    fetch("/api/agent-builder/state").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your workspace.");
      if (!cancelled) {
        setState(data.state);
        if (data.state.hired) void fetchJobs();
      }
    }).catch((error) => { if (!cancelled) setMessage(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [unlocked, googleConfigured, signedIn, fetchJobs]);

  useEffect(() => {
    if (!state.hired || !unlocked) return;
    const timer = window.setInterval(() => { void fetchJobs(); }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [state.hired, unlocked, fetchJobs]);

  useEffect(() => {
    if (selectedJob) applicationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedJob?.id]);

  async function persist(next: AgentState) {
    setState(next);
    stateRef.current = next;
    const response = await fetch("/api/agent-builder/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error || "Could not save your work.");
    }
  }

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlocking(true);
    setMessage("");
    try {
      const response = await fetch("/api/agent-builder/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not unlock.");
      setUnlocking(false);
    }
  }

  async function upload(file?: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/agent-builder/resume", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not read this resume.");
      const next = { ...stateRef.current, fileName: data.fileName, resumeText: data.resumeText, category: data.category, experienceYears: data.experienceYears, jobType: data.jobType, region: data.region, hired: false, savedJobs: [], drafts: {} };
      await persist(next);
      setJobs([]);
      setSelectedJob(null);
      setSearch("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read this resume.");
    } finally {
      setBusy(false);
    }
  }

  async function hire() {
    const next = { ...stateRef.current, hired: true };
    await persist(next);
    await fetchJobs();
  }

  async function openJob(job: MatchedJob, regenerate = false) {
    const requestId = ++draftRequestRef.current;
    setSelectedJob(job);
    setDraftTab("resume");
    if (stateRef.current.drafts[job.id] && !regenerate) {
      setDrafting(false);
      return;
    }
    setDrafting(true);
    try {
      const response = await fetch("/api/agent-builder/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job, useAi: aiConfigured && stateRef.current.aiConsent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not prepare application drafts.");
      if (requestId !== draftRequestRef.current) return;
      await persist({ ...stateRef.current, drafts: { ...stateRef.current.drafts, [job.id]: data.draft } });
      setDraftEngine(data.engine);
      if (data.warning) setMessage(data.warning);
    } catch (error) {
      if (requestId === draftRequestRef.current) setMessage(error instanceof Error ? error.message : "Could not prepare application drafts.");
    } finally {
      if (requestId === draftRequestRef.current) setDrafting(false);
    }
  }

  async function saveJob(job: MatchedJob) {
    const saved = stateRef.current.savedJobs.includes(job.id);
    await persist({ ...stateRef.current, savedJobs: saved ? stateRef.current.savedJobs.filter((id) => id !== job.id) : [...stateRef.current.savedJobs, job.id] });
  }

  function updateDraft(value: string) {
    if (!selectedJob) return;
    const current = stateRef.current.drafts[selectedJob.id];
    if (!current) return;
    const next = { ...stateRef.current, drafts: { ...stateRef.current.drafts, [selectedJob.id]: { ...current, [draftTab]: value } } };
    stateRef.current = next;
    setState(next);
  }

  function updateSubject(value: string) {
    if (!selectedJob) return;
    const current = stateRef.current.drafts[selectedJob.id];
    if (!current) return;
    const next = { ...stateRef.current, drafts: { ...stateRef.current.drafts, [selectedJob.id]: { ...current, subject: value } } };
    stateRef.current = next;
    setState(next);
  }

  async function changeRegion(region: string) {
    setSelectedJob(null);
    await persist({ ...stateRef.current, region });
    if (stateRef.current.hired) await fetchJobs();
  }

  const draft = selectedJob ? state.drafts[selectedJob.id] : null;
  const currentText = draft?.[draftTab] || "";
  const subject = draft?.subject || (selectedJob ? `Application for ${selectedJob.title} at ${selectedJob.company}` : "");
  const emailUrl = selectedJob?.contactEmail && draft ? `mailto:${selectedJob.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft.email.replace(/^Subject:.*\n\n/, ""))}` : "";
  const visibleJobs = jobs.filter((job) => `${job.title} ${job.company}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="agent-shell">
    <section className="agent-left">
      {!unlocked ? <div className="agent-gate">
        <div className="agent-gate-icon"><LockKeyhole size={25} /></div>
        <p className="agent-eyebrow">PRIVATE WORKSPACE</p>
        <h1>Your job agent,<br />behind one door.</h1>
        <p className="agent-muted">Enter the local access password to continue.</p>
        <form onSubmit={unlock} className="agent-unlock-form">
          <label htmlFor="agent-password">Password</label>
          <input id="agent-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          <button type="submit" disabled={unlocking}>{unlocking ? "Opening..." : "Unlock agent"}</button>
        </form>
      </div> : googleConfigured && !signedIn ? <div className="agent-gate">
        <div className="agent-gate-icon"><Mail size={25} /></div>
        <p className="agent-eyebrow">ONE MORE STEP</p>
        <h1>Sign in to save<br />your search.</h1>
        <p className="agent-muted">Your resume, saved jobs, and drafts stay in your account.</p>
        <form action={signInToJobAgent} className="agent-unlock-form"><button type="submit">Continue with Google</button></form>
      </div> : <>
        <div className="agent-upload-band">
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" hidden onChange={(event) => void upload(event.target.files?.[0])} />
          <div className="agent-upload-card">
            <span className="agent-file-icon"><FileText size={23} /></span>
            <div className="agent-file-info"><strong>{state.fileName || "Your resume"}</strong><span>{state.fileName ? "Ready to work" : "Upload a PDF or text file"}</span></div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="agent-file-button">{state.fileName ? "Change file" : "Choose file"}</button>
          </div>
        </div>
        <div className="agent-content">
          {loading ? <p className="agent-muted">Loading your workspace...</p> : state.fileName ? <>
            <h1>Based on your resume<br />this is what we found out:</h1>
            <div className="agent-facts">
              <div><span>Experience</span><strong>{state.experienceYears ? `${state.experienceYears} years` : "Not specified"}</strong></div>
              <div><span>Job type</span><strong>{state.jobType}</strong></div>
              <div><span>Category</span><strong>{state.category}</strong></div>
              <label className="agent-region"><span>Eligible region</span><select value={state.region || "Worldwide"} onChange={(event) => void changeRegion(event.target.value)}><option>Worldwide</option><option>Europe</option><option>United States</option><option>Canada</option><option>United Kingdom</option></select></label>
            </div>
            <div className="agent-card">
              <span className="agent-badge"><Binoculars size={15} /> AGENT 001</span>
              <h2>What the agent will do:</h2>
              <ul>
                <li><Check size={17} /> Look for jobs that match you.</li>
                <li><Check size={17} /> Help tailor your resume and cover letter.</li>
                <li><Check size={17} /> Draft an email for your review.</li>
                <li><Check size={17} /> Monitor new job posts while this page is open.</li>
              </ul>
              {aiConfigured && <label className="agent-ai-consent"><input type="checkbox" checked={Boolean(state.aiConsent)} onChange={(event) => void persist({ ...stateRef.current, aiConsent: event.target.checked })} /> Use Gemini drafts (sends resume text to Google)</label>}
              <div className="agent-card-footer">{state.hired ? <span className="agent-running"><span /> Agent active</span> : <button type="button" className="agent-hire" onClick={() => void hire()} disabled={busy}>Hire Agent</button>}</div>
            </div>
            {state.hired && <div className="agent-jobs">
              <div className="agent-section-heading"><div><p className="agent-eyebrow">LIVE SEARCH</p><h2>Job matches</h2></div><button type="button" className="agent-icon-button" title="Refresh jobs" aria-label="Refresh jobs" onClick={() => void fetchJobs()} disabled={busy}><RefreshCw size={19} className={busy ? "agent-spin" : ""} /></button></div>
              {jobs.length > 0 && <p className="agent-match-intro">{matchTier === "primary" ? "Fresh roles matching your resume" : "No exact role is open; these related roles match skills in your resume."}</p>}
              <div className="agent-search-form"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Filter job matches" placeholder="Filter matches" /></div>
              {selectedJob && <div className="agent-application" ref={applicationRef}>
                <div className="agent-application-head"><div><p className="agent-eyebrow">APPLICATION WORKSPACE</p><h3>{selectedJob.title}</h3><span>{selectedJob.company}</span></div><button type="button" className="agent-icon-button" title="Regenerate drafts" aria-label="Regenerate drafts" onClick={() => void openJob(selectedJob, true)} disabled={drafting}><RefreshCw size={18} className={drafting ? "agent-spin" : ""} /></button></div>
                <p className="agent-match-reason">{selectedJob.matchReason}</p>
                <div className="agent-destination"><strong>Where to apply</strong>{selectedJob.contactEmail ? <a href={`mailto:${selectedJob.contactEmail}`}>{selectedJob.contactEmail}</a> : <span>No direct application email listed.</span>}<a href={selectedJob.url} target="_blank" rel="noreferrer">Open job posting <ArrowUpRight size={15} /></a></div>
                {drafting && <p className="agent-drafting"><WandSparkles size={17} /> Tailoring your application...</p>}
                {draft && <><div className="agent-tabs"><button type="button" className={draftTab === "resume" ? "active" : ""} onClick={() => setDraftTab("resume")}>Resume</button><button type="button" className={draftTab === "coverLetter" ? "active" : ""} onClick={() => setDraftTab("coverLetter")}>Cover letter</button><button type="button" className={draftTab === "email" ? "active" : ""} onClick={() => setDraftTab("email")}>Email</button></div>
                  {draftTab === "email" && <label className="agent-subject"><span>Suggested subject</span><input value={subject} onChange={(event) => updateSubject(event.target.value)} onBlur={() => void persist(stateRef.current)} /></label>}
                  <textarea className="agent-draft-text" aria-label={`${draftTab} draft`} value={currentText} onChange={(event) => updateDraft(event.target.value)} onBlur={() => void persist(stateRef.current)} />
                  <div className="agent-draft-actions"><button type="button" onClick={() => void navigator.clipboard.writeText(draftTab === "email" ? `Subject: ${subject}\n\n${currentText}` : currentText)}><Copy size={16} /> Copy {draftTab === "email" ? "email" : "draft"}</button>{draftTab === "email" && selectedJob.contactEmail && <a href={emailUrl}><Mail size={16} /> Open email draft</a>}{!selectedJob.contactEmail && <a href={selectedJob.url} target="_blank" rel="noreferrer"><ArrowUpRight size={16} /> Apply on job post</a>}</div>
                  {draftEngine === "local" && <p className="agent-draft-note">Review and edit this draft before applying.</p>}
                </>}
              </div>}
              {visibleJobs.length ? <div className="agent-job-list">{visibleJobs.map((job) => <div className={`agent-job ${selectedJob?.id === job.id ? "agent-job-selected" : ""}`} key={job.id}><button type="button" className="agent-job-main" onClick={() => void openJob(job)}><strong>{job.title}</strong><span>{job.company} · {job.location}</span><small><Clock3 size={13} /> {new Date(job.publishedAt).toLocaleDateString()} · {job.matchReason}</small></button><button type="button" className={`agent-icon-button ${state.savedJobs.includes(job.id) ? "is-saved" : ""}`} title={state.savedJobs.includes(job.id) ? "Remove saved job" : "Save job"} aria-label={state.savedJobs.includes(job.id) ? "Remove saved job" : "Save job"} onClick={() => void saveJob(job)}><Bookmark size={18} fill={state.savedJobs.includes(job.id) ? "currentColor" : "none"} /></button><a className="agent-icon-button" href={job.url} target="_blank" rel="noreferrer" title="Open job posting" aria-label="Open job posting"><ArrowUpRight size={19} /></a></div>)}</div> : !busy && jobs.length > 0 ? <p className="agent-muted">No matches in this list. Clear the filter.</p> : !busy && !message ? <p className="agent-muted">New matches will appear here.</p> : null}
            </div>}
          </> : <div className="agent-empty"><p className="agent-eyebrow">AGENT 001</p><h1>Start with your resume.</h1><p className="agent-muted">Upload a PDF or text file to see your profile and find remote jobs.</p><button type="button" className="agent-hire" onClick={() => fileRef.current?.click()}>Choose resume</button></div>}
          {message && <p className="agent-message" role="alert">{message}</p>}
        </div>
      </>}
      {!unlocked && message && <p className="agent-message agent-gate-message" role="alert">{message}</p>}
    </section>
    <section className="agent-right"><Orbit active={unlocked && state.hired} /></section>
  </div>;
}
