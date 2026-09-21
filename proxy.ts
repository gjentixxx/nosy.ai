import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { gateCookieName, hasGateAccess } from "@/lib/job-agent/access";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/agent-builder/") &&
      request.nextUrl.pathname !== "/api/agent-builder/unlock" &&
      !hasGateAccess(request.cookies.get(gateCookieName)?.value)) {
    return NextResponse.json({ error: "Private access required." }, { status: 401 });
  }
  if (!hasSupabaseConfig()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
