import { NextRequest, NextResponse } from "next/server";
import { correctGatePassword, gateCookieName, gateToken } from "@/lib/job-agent/access";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !correctGatePassword(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(gateCookieName, gateToken()!, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return response;
}
