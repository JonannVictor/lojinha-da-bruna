// Supabase settings read from the environment. Only the project URL and the
// publishable key are public (NEXT_PUBLIC_*). The secret key is read in
// service-client.ts, which is server-only. See docs/supabase.md.

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function readSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig | null {
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl || !publishableKey) return null;

  // A secret key in a NEXT_PUBLIC_ variable would be shipped to the browser.
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contém uma chave secreta. Use a chave publicável (sb_publishable_…).",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.");
  }
  return { url: url.origin, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() !== null;
}

/** Same as readSupabaseConfig, but throws when the variables are missing. */
export function requireSupabaseConfig(): SupabaseConfig {
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return config;
}

export const PRODUCT_IMAGES_BUCKET = "product-images";
