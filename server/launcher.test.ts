import { describe, expect, it } from "vitest";
import {
  buildAskTarget,
  groupByKind,
  LAUNCHER_SEEDS,
  matchesSearch,
  normalizeHttpsUrl,
  quickAccess,
  recentlyUsed,
  type LauncherItem,
} from "../shared/launcher";

const item = (patch: Partial<LauncherItem> & { id: number; name: string }): LauncherItem => ({
  url: "https://example.com/",
  kind: "tool",
  pinned: false,
  openCount: 0,
  lastOpenedAt: null,
  ...patch,
});

describe("normalizeHttpsUrl", () => {
  it("completa endereços digitados no celular", () => {
    expect(normalizeHttpsUrl("claude.ai")).toBe("https://claude.ai/");
    expect(normalizeHttpsUrl("  https://gemini.google.com/app ")).toBe("https://gemini.google.com/app");
  });
  it("recusa protocolos que não sejam HTTPS", () => {
    for (const bad of ["http://claude.ai", "javascript:alert(1)", "data:text/html,x", "ftp://x.com", "file:///etc/passwd", "intent://x#Intent;end"]) {
      expect(normalizeHttpsUrl(bad)).toBeNull();
    }
  });
  it("recusa vazio, espaços no meio, host sem ponto e credenciais embutidas", () => {
    for (const bad of ["", "   ", "meu app.com", "localhost", "https://user:pass@claude.ai/"]) {
      expect(normalizeHttpsUrl(bad)).toBeNull();
    }
  });
});

describe("buildAskTarget", () => {
  it("preenche a pergunta só onde o endereço aceita", () => {
    expect(buildAskTarget("https://claude.ai/new", "oi & tudo bem?")).toEqual({ url: "https://claude.ai/new?q=oi%20%26%20tudo%20bem%3F", prefilled: true });
    expect(buildAskTarget("https://chatgpt.com/", "oi").prefilled).toBe(true);
  });
  it("nas demais IAs só abre o site (o texto é copiado pela tela)", () => {
    expect(buildAskTarget("https://gemini.google.com/app", "oi")).toEqual({ url: "https://gemini.google.com/app", prefilled: false });
  });
  it("sem texto, abre o endereço salvo", () => {
    expect(buildAskTarget("https://claude.ai/new", "   ")).toEqual({ url: "https://claude.ai/new", prefilled: false });
  });
});

describe("organização do lançador", () => {
  it("acesso rápido mostra só fixados, em ordem alfabética", () => {
    const list = [item({ id: 1, name: "Zeta", pinned: true }), item({ id: 2, name: "Alfa", pinned: true }), item({ id: 3, name: "Beta" })];
    expect(quickAccess(list).map(i => i.name)).toEqual(["Alfa", "Zeta"]);
  });
  it("usados por último ignora fixados e nunca abertos", () => {
    const list = [
      item({ id: 1, name: "A", lastOpenedAt: "2026-11-20T10:00:00Z" }),
      item({ id: 2, name: "B", lastOpenedAt: "2026-11-26T10:00:00Z" }),
      item({ id: 3, name: "C", pinned: true, lastOpenedAt: "2026-11-27T10:00:00Z" }),
      item({ id: 4, name: "D" }),
    ];
    expect(recentlyUsed(list).map(i => i.name)).toEqual(["B", "A"]);
  });
  it("agrupa por tipo, omite grupos vazios e põe fixados primeiro", () => {
    const groups = groupByKind([item({ id: 1, name: "B", kind: "ai" }), item({ id: 2, name: "A", kind: "ai", pinned: true }), item({ id: 3, name: "C", kind: "app" })]);
    expect(groups.map(g => g.kind)).toEqual(["ai", "app"]);
    expect(groups[0].items.map(i => i.name)).toEqual(["A", "B"]);
  });
  it("busca por nome, descrição ou domínio", () => {
    const row = { name: "Claude", url: "https://claude.ai/new", description: "Conversar e revisar", category: "IA" };
    expect(matchesSearch(row, "claude.ai")).toBe(true);
    expect(matchesSearch(row, "revisar")).toBe(true);
    expect(matchesSearch(row, "suno")).toBe(false);
    expect(matchesSearch(row, "")).toBe(true);
  });
});

describe("atalhos iniciais", () => {
  it("todos são HTTPS válidos e sem hosts repetidos", () => {
    const hosts = LAUNCHER_SEEDS.map(seed => {
      const normalized = normalizeHttpsUrl(seed.url);
      expect(normalized, seed.name).not.toBeNull();
      return new URL(normalized!).hostname.replace(/^www\./, "");
    });
    expect(new Set(hosts).size).toBe(hosts.length);
  });
});
