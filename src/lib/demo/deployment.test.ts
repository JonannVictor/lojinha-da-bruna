import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDeploymentConfig, deploymentConfigErrors, SUPABASE_ENV_KEYS } from "./deployment";

const supabase = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

/** What the Vercel project must have in Production for the public demo. */
const publicDemo = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_DEMO_MODE: "true",
  ALLOW_DEMO_IN_PRODUCTION: "true",
};

describe("real store (default)", () => {
  it("builds anywhere without demo variables, with or without Supabase", () => {
    expect(assertDeploymentConfig({})).toBe("store");
    expect(assertDeploymentConfig({ VERCEL_ENV: "production", ...supabase })).toBe("store");
    expect(assertDeploymentConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "false" })).toBe("store");
    expect(assertDeploymentConfig({ VERCEL_ENV: "preview", NEXT_PUBLIC_DEMO_MODE: "" })).toBe("store");
  });
});

describe("demonstration outside production", () => {
  it("builds locally and on Vercel Preview with only NEXT_PUBLIC_DEMO_MODE", () => {
    expect(assertDeploymentConfig({ NEXT_PUBLIC_DEMO_MODE: "true" })).toBe("demo");
    expect(assertDeploymentConfig({ NEXT_PUBLIC_DEMO_MODE: "true", VERCEL_ENV: "preview" })).toBe("demo");
  });

  it("ignores Supabase variables (they stay unused in demo mode)", () => {
    expect(assertDeploymentConfig({ NEXT_PUBLIC_DEMO_MODE: "true", VERCEL_ENV: "preview", ...supabase })).toBe("demo");
  });
});

describe("public demonstration in Vercel production", () => {
  it("builds with the explicit opt-in and no Supabase", () => {
    expect(deploymentConfigErrors(publicDemo)).toEqual([]);
    expect(assertDeploymentConfig(publicDemo)).toBe("demo");
  });

  it("is refused without the opt-in (the old guard still holds)", () => {
    const env = { VERCEL_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "true" };
    expect(() => assertDeploymentConfig(env)).toThrow(/exige ALLOW_DEMO_IN_PRODUCTION=true/);
  });

  it.each(SUPABASE_ENV_KEYS)("never replaces a production store configured with %s", (key) => {
    const env = { ...publicDemo, [key]: "valor" };
    expect(() => assertDeploymentConfig(env)).toThrow(new RegExp(`Supabase configurado \\(${key}\\)`));
  });
});

describe("ambiguous configuration stops the build", () => {
  it.each(["1", "TRUE", "yes", " true", "true\n"])("NEXT_PUBLIC_DEMO_MODE=%j", (value) => {
    expect(() => assertDeploymentConfig({ NEXT_PUBLIC_DEMO_MODE: value })).toThrow(/não é reconhecido/);
  });

  it("an unknown opt-in value", () => {
    expect(() => assertDeploymentConfig({ ...publicDemo, ALLOW_DEMO_IN_PRODUCTION: "sim" })).toThrow(
      /ALLOW_DEMO_IN_PRODUCTION="sim" não é reconhecido/,
    );
  });

  it("the opt-in left behind without demo mode", () => {
    expect(() => assertDeploymentConfig({ VERCEL_ENV: "production", ALLOW_DEMO_IN_PRODUCTION: "true" })).toThrow(
      /só vale junto com NEXT_PUBLIC_DEMO_MODE=true/,
    );
  });

  it("reports every problem at once", () => {
    const errors = deploymentConfigErrors({ VERCEL_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "true", ...supabase });
    expect(errors).toHaveLength(2);
  });
});

describe("next.config.ts", () => {
  const keys = ["VERCEL_ENV", "NEXT_PUBLIC_DEMO_MODE", "ALLOW_DEMO_IN_PRODUCTION", ...SUPABASE_ENV_KEYS];

  function env(values: Record<string, string>) {
    for (const key of keys) vi.stubEnv(key, values[key] ?? "");
    vi.resetModules();
  }

  afterEach(() => vi.unstubAllEnvs());

  it("loads with the public demo configuration", async () => {
    env(publicDemo);
    const { default: config } = await import("../../../next.config");
    expect(config.cacheComponents).toBe(true);
  });

  it("refuses to load when demo mode reaches production without the opt-in", async () => {
    env({ VERCEL_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "true" });
    await expect(import("../../../next.config")).rejects.toThrow(/Configuração de deploy inválida/);
  });

  it("refuses to load when the demo would replace a Supabase production store", async () => {
    env({ ...publicDemo, ...supabase });
    await expect(import("../../../next.config")).rejects.toThrow(/Supabase configurado/);
  });
});
