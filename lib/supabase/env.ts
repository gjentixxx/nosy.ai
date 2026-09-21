export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function hasSupabaseAdminConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function hasGoogleAuthConfig() {
  return process.env.GOOGLE_LOGIN_ENABLED === "true" && hasSupabaseConfig();
}
