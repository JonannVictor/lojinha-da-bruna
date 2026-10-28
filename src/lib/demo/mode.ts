// Demo mode: NEXT_PUBLIC_DEMO_MODE=true. The storefront and the admin panel
// read and write a catalog kept in the browser (localStorage) instead of
// Supabase, and the panel opens without login. Meant only for presenting the
// store; never for real data. next.config.ts refuses to build it for the
// Vercel production environment. See docs/demonstracao.md.
//
// NEXT_PUBLIC_* values are inlined at build time, so server and browser
// always agree. Changing the variable requires restarting `next dev` or a new
// build.

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
