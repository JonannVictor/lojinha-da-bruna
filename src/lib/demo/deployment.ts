// Which store a build produces. Checked by next.config.ts before anything is
// built, so a wrong combination stops the deploy instead of publishing the
// wrong store. See docs/demonstracao.md.
//
// Two explicit modes:
// - Real store (default): NEXT_PUBLIC_DEMO_MODE empty or "false". Supabase,
//   panel with login.
// - Demonstration: NEXT_PUBLIC_DEMO_MODE=true. Fictitious data kept in the
//   visitor's browser, panel without login, Supabase never used.
//
// Vercel production (VERCEL_ENV=production) is where the real store will
// live. The demonstration only builds there with a second, explicit opt-in
// (ALLOW_DEMO_IN_PRODUCTION=true) and only while production has no Supabase
// variables, that is, while there is no real store to replace.
//
// No "@/" imports and no "server-only": next.config.ts loads this file.

export type DeploymentEnv = Record<string, string | undefined>;
export type DeploymentMode = "store" | "demo";

/** Their presence means the environment is set up for the real store. */
export const SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

/** "true" | "false" | empty. Anything else ("1", "TRUE", " true") is ambiguous. */
function readFlag(env: DeploymentEnv, key: string): boolean | null {
  const value = env[key];
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;
  return null;
}

/** Problems that must stop the build; empty when the configuration is valid. */
export function deploymentConfigErrors(env: DeploymentEnv): string[] {
  const demo = readFlag(env, "NEXT_PUBLIC_DEMO_MODE");
  const allowInProduction = readFlag(env, "ALLOW_DEMO_IN_PRODUCTION");
  const errors: string[] = [];

  if (demo === null) {
    errors.push(
      `NEXT_PUBLIC_DEMO_MODE="${env.NEXT_PUBLIC_DEMO_MODE}" não é reconhecido. Use "true" para a demonstração ou deixe vazio (ou "false") para a loja real.`,
    );
  }
  if (allowInProduction === null) {
    errors.push(
      `ALLOW_DEMO_IN_PRODUCTION="${env.ALLOW_DEMO_IN_PRODUCTION}" não é reconhecido. Use "true" ou deixe vazio.`,
    );
  }
  if (demo === null || allowInProduction === null) return errors;

  if (allowInProduction && !demo) {
    errors.push(
      "ALLOW_DEMO_IN_PRODUCTION=true só vale junto com NEXT_PUBLIC_DEMO_MODE=true. Ao voltar para a loja real, remova as duas variáveis.",
    );
  }

  if (demo && env.VERCEL_ENV === "production") {
    if (!allowInProduction) {
      errors.push(
        "NEXT_PUBLIC_DEMO_MODE=true em produção exige ALLOW_DEMO_IN_PRODUCTION=true (demonstração pública, veja docs/demonstracao.md). Para a loja real, remova NEXT_PUBLIC_DEMO_MODE.",
      );
    }
    const supabaseKeys = SUPABASE_ENV_KEYS.filter((key) => env[key]);
    if (supabaseKeys.length > 0) {
      errors.push(
        `A demonstração não pode ser publicada em produção com o Supabase configurado (${supabaseKeys.join(", ")}): esse ambiente é da loja real. Remova NEXT_PUBLIC_DEMO_MODE e ALLOW_DEMO_IN_PRODUCTION para publicar a loja real.`,
      );
    }
  }

  return errors;
}

/** Throws with every problem found; otherwise returns the mode being built. */
export function assertDeploymentConfig(env: DeploymentEnv): DeploymentMode {
  const errors = deploymentConfigErrors(env);
  if (errors.length > 0) {
    throw new Error(`Configuração de deploy inválida:\n- ${errors.join("\n- ")}`);
  }
  return env.NEXT_PUBLIC_DEMO_MODE === "true" ? "demo" : "store";
}
