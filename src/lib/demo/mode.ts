// Demo mode: NEXT_PUBLIC_DEMO_MODE=true. The storefront and the admin panel
// read and write a catalog kept in the browser (localStorage) instead of
// Supabase, and the panel opens without login. Meant only for presenting the
// store; never for real data. Which environments may build it (Vercel
// production only with an explicit opt-in and no Supabase) is decided in
// deployment.ts. See docs/demonstracao.md.
//
// NEXT_PUBLIC_* values are inlined at build time, so server and browser
// always agree. Changing the variable requires restarting `next dev` or a new
// build.

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
