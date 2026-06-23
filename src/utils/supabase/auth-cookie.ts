export function resolveSupabaseAuthCookieName(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (publicUrl) {
    try {
      const projectRef = new URL(publicUrl).hostname.split('.')[0];
      if (projectRef) {
        return `sb-${projectRef}-auth-token`;
      }
    } catch {
      // Fall through to the stable local fallback below.
    }
  }

  return 'sb-lucent-auth-token';
}
