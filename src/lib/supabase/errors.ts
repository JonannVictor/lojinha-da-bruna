// Uniform handling of errors returned by supabase-js. Details (codes,
// messages) go to the server log only; the UI receives generic messages, so a
// failure never leaks table names, constraint names or connection data.

export type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

/** Thrown when the data source can't answer. Never returns partial data. */
export class DataSourceError extends Error {
  constructor(
    readonly context: string,
    readonly code: string | null,
  ) {
    super(`Falha ao acessar os dados (${context}).`);
    this.name = "DataSourceError";
  }
}

export function logSupabaseError(context: string, error: SupabaseErrorLike) {
  console.error(`[supabase] ${context}: ${error.code || "sem código"} — ${error.message || ""}`);
}

export function toDataSourceError(context: string, error: SupabaseErrorLike): DataSourceError {
  logSupabaseError(context, error);
  return new DataSourceError(context, error.code ?? null);
}

/** Postgres foreign_key_violation (e.g. deleting a product with orders). */
export function isForeignKeyViolation(error: SupabaseErrorLike | null): boolean {
  return error?.code === "23503";
}

/** Postgres unique_violation (e.g. a slug already in use). */
export function isUniqueViolation(error: SupabaseErrorLike | null): boolean {
  return error?.code === "23505";
}

/** Postgres check_violation (a database constraint rejected the values). */
export function isCheckViolation(error: SupabaseErrorLike | null): boolean {
  return error?.code === "23514";
}
