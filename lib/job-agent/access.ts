import { createHmac, timingSafeEqual } from "node:crypto";

export const gateCookieName = "job_agent_access";

export function gateToken() {
  const password = process.env.AGENT_BUILDER_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("job-agent-local-access-v1").digest("hex");
}

export function hasGateAccess(cookieValue?: string) {
  const expected = gateToken();
  if (!expected || !cookieValue || cookieValue.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected));
}

export function correctGatePassword(input: string) {
  const expected = process.env.AGENT_BUILDER_PASSWORD;
  if (!expected || input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}
