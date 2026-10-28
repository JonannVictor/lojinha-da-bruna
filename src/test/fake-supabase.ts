import type { SupabaseClient } from "@supabase/supabase-js";

// Minimal stand-in for supabase-js in unit tests. Query builders record every
// chained call ("select", "eq", "insert"...) and resolve with whatever the
// test's handler returns for that call, so tests can assert both the query
// that was built and how the code reacts to data or errors.

export type PostgrestErrorLike = { code?: string; message?: string; status?: number };
export type Result = { data: unknown; error: PostgrestErrorLike | null; count?: number | null };

export type QueryCall = {
  table: string;
  ops: { method: string; args: unknown[] }[];
};

export type FakeOptions = {
  query?: (call: QueryCall) => Result;
  rpc?: (name: string, args: unknown) => Result;
  upload?: (path: string, body: unknown, options: unknown) => { error: PostgrestErrorLike | null };
  remove?: (paths: string[]) => { error: PostgrestErrorLike | null };
  claims?: Record<string, unknown> | null;
};

export function has(call: QueryCall, method: string, ...args: unknown[]): boolean {
  return call.ops.some(
    (op) => op.method === method && args.every((arg, i) => JSON.stringify(op.args[i]) === JSON.stringify(arg)),
  );
}

export function argsOf(call: QueryCall, method: string): unknown[] | undefined {
  return call.ops.find((op) => op.method === method)?.args;
}

export function createFakeClient(options: FakeOptions = {}) {
  const calls: QueryCall[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];
  const uploads: { path: string; body: unknown; options: unknown }[] = [];
  const removals: string[][] = [];
  const log: string[] = [];

  function thenable(produce: () => Result | Promise<Result>) {
    return {
      then(resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve().then(produce).then(resolve, reject);
      },
    };
  }

  function from(table: string) {
    const call: QueryCall = { table, ops: [] };
    calls.push(call);
    const builder: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return thenable(() => {
              log.push(`db:${table}:${call.ops[0]?.method}`);
              return options.query?.(call) ?? { data: null, error: null };
            }).then;
          }
          return (...args: unknown[]) => {
            call.ops.push({ method: String(prop), args });
            return builder;
          };
        },
      },
    );
    return builder;
  }

  const client = {
    from,
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      return thenable(() => options.rpc?.(name, args) ?? { data: null, error: null });
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, body: unknown, uploadOptions: unknown) {
            log.push(`storage:${bucket}:upload`);
            uploads.push({ path, body, options: uploadOptions });
            return { data: { path }, ...(options.upload?.(path, body, uploadOptions) ?? { error: null }) };
          },
          async remove(paths: string[]) {
            log.push(`storage:${bucket}:remove`);
            removals.push(paths);
            return { data: [], ...(options.remove?.(paths) ?? { error: null }) };
          },
        };
      },
    },
    auth: {
      async getClaims() {
        return options.claims
          ? { data: { claims: options.claims }, error: null }
          : { data: null, error: null };
      },
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    calls,
    rpcCalls,
    uploads,
    removals,
    /** Order in which database and storage operations ran. */
    log,
  };
}
