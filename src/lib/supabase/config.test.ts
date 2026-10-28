import { describe, expect, it } from "vitest";
import { readSupabaseConfig } from "./config";
import { readSecretKey } from "./service-client";

describe("readSupabaseConfig", () => {
  it("returns null until both public variables are set", () => {
    expect(readSupabaseConfig({})).toBeNull();
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" })).toBeNull();
  });

  it("normalizes the project URL", () => {
    expect(
      readSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co/ ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
      }),
    ).toEqual({ url: "https://abc.supabase.co", publishableKey: "sb_publishable_x" });
  });

  it("refuses a secret key in a NEXT_PUBLIC_ variable (it would reach the browser)", () => {
    expect(() =>
      readSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
      }),
    ).toThrow(/chave secreta/);
  });

  it("rejects an invalid URL without echoing it", () => {
    expect(() =>
      readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "nota url", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.");
  });
});

describe("readSecretKey", () => {
  it("reads only the server-side variable", () => {
    expect(readSecretKey({})).toBeNull();
    expect(readSecretKey({ SUPABASE_SECRET_KEY: " " })).toBeNull();
    expect(readSecretKey({ SUPABASE_SECRET_KEY: "sb_secret_x" })).toBe("sb_secret_x");
  });
});
