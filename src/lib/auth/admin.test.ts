import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClient, has } from "@/test/fake-supabase";

class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`redirect:${url}`);
  }
}

const session = vi.hoisted(() => ({ client: null as unknown, configured: true }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server-client", () => ({ createSessionClient: async () => session.client }));
vi.mock("@/lib/supabase/config", async (original) => ({
  ...(await original<object>()),
  isSupabaseConfigured: () => session.configured,
}));

const { requireAdmin, resolveSessionStatus, safeAdminRedirect } = await import("./admin");

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  session.configured = true;
  session.client = null;
});

describe("resolveSessionStatus", () => {
  it("is anonymous without a valid JWT", async () => {
    const fake = createFakeClient({ claims: null });
    expect(await resolveSessionStatus(fake.client)).toEqual({ status: "anonymous" });
    expect(fake.calls).toEqual([]);
  });

  it("is forbidden for signed-in users missing from admin_users", async () => {
    const fake = createFakeClient({ claims: { sub: USER, email: "a@b.c" }, query: () => ({ data: null, error: null }) });
    expect(await resolveSessionStatus(fake.client)).toEqual({ status: "forbidden", email: "a@b.c" });
    expect(fake.calls[0].table).toBe("admin_users");
    expect(has(fake.calls[0], "eq", "user_id", USER)).toBe(true);
  });

  it("is admin only when the admin_users row exists", async () => {
    const fake = createFakeClient({ claims: { sub: USER }, query: () => ({ data: { user_id: USER }, error: null }) });
    expect(await resolveSessionStatus(fake.client)).toEqual({
      status: "admin",
      session: { userId: USER, email: null },
    });
  });

  it("does not grant access when the check itself fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({ claims: { sub: USER }, query: () => ({ data: null, error: { code: "08006" } }) });
    await expect(resolveSessionStatus(fake.client)).rejects.toThrow();
  });
});

describe("requireAdmin", () => {
  it("redirects anonymous visitors to the login page", async () => {
    session.client = createFakeClient({ claims: null }).client;
    await expect(requireAdmin()).rejects.toMatchObject({ url: "/admin/login" });
  });

  it("redirects non-admin users with an explanation", async () => {
    session.client = createFakeClient({ claims: { sub: USER }, query: () => ({ data: null, error: null }) }).client;
    await expect(requireAdmin()).rejects.toMatchObject({ url: "/admin/login?erro=sem-permissao" });
  });

  it("redirects when Supabase is not configured", async () => {
    session.configured = false;
    await expect(requireAdmin()).rejects.toMatchObject({ url: "/admin/login" });
  });

  it("returns the session-bound client for admins", async () => {
    const fake = createFakeClient({ claims: { sub: USER }, query: () => ({ data: { user_id: USER }, error: null }) });
    session.client = fake.client;
    const result = await requireAdmin();
    expect(result.session.userId).toBe(USER);
    expect(result.supabase).toBe(fake.client);
  });
});

describe("safeAdminRedirect", () => {
  it.each([
    ["/admin/produtos", "/admin/produtos"],
    ["/admin", "/admin"],
    ["https://evil.example", "/admin"],
    ["//evil.example/admin", "/admin"],
    ["/admin/../../etc", "/admin"],
    ["/adminx", "/admin"],
    ["/admin/login", "/admin"],
    [null, "/admin"],
  ])("%s → %s", (raw, expected) => {
    expect(safeAdminRedirect(raw)).toBe(expected);
  });
});
