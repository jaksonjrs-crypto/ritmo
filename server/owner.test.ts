import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

afterEach(() => vi.unstubAllEnvs());

const ctxFor = (openId: string | null): TrpcContext => ({
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
  user: openId ? ({ id: 1, openId, name: "Teste", email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as TrpcContext["user"]) : null,
});

describe("espaço privado (OWNER_OPEN_ID)", () => {
  it("bloqueia outra conta antes de tocar no banco", async () => {
    vi.stubEnv("OWNER_OPEN_ID", "dono");
    await expect(appRouter.createCaller(ctxFor("intruso")).hub.workspace()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(ctxFor("intruso")).hub.createShortcut({ name: "x", url: "x.com", category: "x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("exige login mesmo sem dono configurado", async () => {
    vi.stubEnv("OWNER_OPEN_ID", "");
    await expect(appRouter.createCaller(ctxFor(null)).hub.workspace()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("rejeita endereço que não seja HTTPS para o dono", async () => {
    vi.stubEnv("OWNER_OPEN_ID", "dono");
    await expect(appRouter.createCaller(ctxFor("dono")).hub.createShortcut({ name: "x", url: "javascript:alert(1)", category: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
