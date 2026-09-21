import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { inferRegion } from "./matching";

export type AgentState = {
  fileName: string;
  resumeText: string;
  category: string;
  experienceYears: number;
  jobType: string;
  region: string;
  hired: boolean;
  aiConsent: boolean;
  savedJobs: string[];
  drafts: Record<string, { resume: string; coverLetter: string; email: string; subject?: string }>;
};

const emptyState: AgentState = {
  fileName: "",
  resumeText: "",
  category: "",
  experienceYears: 0,
  jobType: "Remote",
  region: "Worldwide",
  hired: false,
  aiConsent: false,
  savedJobs: [],
  drafts: {}
};

function withDefaults(value?: Partial<AgentState>): AgentState {
  return { ...emptyState, ...value, region: value?.region || inferRegion(value?.resumeText || ""), aiConsent: Boolean(value?.aiConsent) };
}

function localDb() {
  const folder = path.join(process.cwd(), ".data");
  mkdirSync(folder, { recursive: true });
  const db = new DatabaseSync(path.join(folder, "job-agent.db"));
  db.exec("create table if not exists agent_state (user_id text primary key, state text not null, updated_at text not null)");
  return db;
}

export async function loadAgentState(userId: string): Promise<AgentState> {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("job_agent_state").select("state").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return withDefaults(data?.state as Partial<AgentState> | undefined);
  }
  const db = localDb();
  try {
    const row = db.prepare("select state from agent_state where user_id = ?").get(userId) as { state: string } | undefined;
    return row ? withDefaults(JSON.parse(row.state)) : emptyState;
  } finally {
    db.close();
  }
}

export async function saveAgentState(userId: string, state: AgentState) {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.from("job_agent_state").upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return;
  }
  const db = localDb();
  try {
    db.prepare("insert into agent_state (user_id, state, updated_at) values (?, ?, ?) on conflict(user_id) do update set state = excluded.state, updated_at = excluded.updated_at")
      .run(userId, JSON.stringify(state), new Date().toISOString());
  } finally {
    db.close();
  }
}
