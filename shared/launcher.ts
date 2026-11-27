// Regras puras do lançador (IAs, apps e sites). Usadas no servidor e no cliente,
// por isso não dependem de nada além de TypeScript.

export const SHORTCUT_KINDS = ["ai", "app", "site", "social", "tool"] as const;
export type ShortcutKind = (typeof SHORTCUT_KINDS)[number];

export const KIND_LABELS: Record<ShortcutKind, string> = {
  ai: "Inteligências artificiais",
  app: "Meus apps e PWAs",
  site: "Meus sites",
  social: "Redes e publicação",
  tool: "Ferramentas",
};

export const KIND_SHORT_LABELS: Record<ShortcutKind, string> = {
  ai: "IA",
  app: "App",
  site: "Site",
  social: "Rede",
  tool: "Ferramenta",
};

export type LauncherSeed = {
  name: string;
  url: string;
  kind: ShortcutKind;
  category: string;
  emoji: string;
  description: string;
  pinned: boolean;
};

/** Pontos de partida editáveis. Nada aqui conecta contas: cada item só abre o endereço. */
export const LAUNCHER_SEEDS: LauncherSeed[] = [
  { name: "Claude", url: "https://claude.ai/new", kind: "ai", category: "IA", emoji: "🟠", description: "Conversar, escrever e revisar", pinned: true },
  { name: "Gemini", url: "https://gemini.google.com/app", kind: "ai", category: "IA", emoji: "✨", description: "Google AI Pro", pinned: true },
  { name: "ChatGPT", url: "https://chatgpt.com/", kind: "ai", category: "IA", emoji: "💬", description: "Conversar com o GPT", pinned: true },
  { name: "Manus", url: "https://manus.im/", kind: "ai", category: "IA", emoji: "🛠️", description: "Criar apps e tarefas longas", pinned: true },
  { name: "ElevenLabs", url: "https://elevenlabs.io/app", kind: "ai", category: "Áudio e voz", emoji: "🎙️", description: "Voz e áudio", pinned: true },
  { name: "Suno", url: "https://suno.com/", kind: "ai", category: "Música", emoji: "🎵", description: "Criar músicas", pinned: true },
  { name: "Minha Vitrine dos Achados", url: "https://www.minhavitrinedeachados.com.br/", kind: "site", category: "Vitrine", emoji: "🛍️", description: "Site da Vitrine", pinned: true },
  { name: "Pequenas Viagens", url: "https://viagens.dozeroaorag.com.br/", kind: "app", category: "PWA", emoji: "🧳", description: "PWA de viagens", pinned: false },
  { name: "Lulu e Lelê", url: "https://lulu.dozeroaorag.com.br/", kind: "site", category: "Livro", emoji: "🐞", description: "Site do livro", pinned: false },
  { name: "Google Agenda", url: "https://calendar.google.com/", kind: "tool", category: "Agenda", emoji: "📅", description: "Agenda do Google", pinned: true },
  { name: "Canva", url: "https://www.canva.com/", kind: "tool", category: "Design", emoji: "🎨", description: "Artes e capas", pinned: false },
  { name: "Metricool", url: "https://app.metricool.com/", kind: "social", category: "Redes sociais", emoji: "📈", description: "Posts agendados", pinned: false },
  { name: "GitHub", url: "https://github.com/", kind: "tool", category: "Código", emoji: "🐙", description: "Repositórios", pinned: false },
  { name: "Vercel", url: "https://vercel.com/dashboard", kind: "tool", category: "Código", emoji: "▲", description: "Publicações dos sites", pinned: false },
];

/**
 * Aceita "claude.ai" digitado no celular e devolve um endereço HTTPS válido.
 * Retorna null para qualquer outro protocolo (http, javascript:, data: etc.).
 */
export function normalizeHttpsUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 1000 || /\s/.test(raw)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  if (hasScheme && !/^https:\/\//i.test(raw)) return null;
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/\//, "")}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || !parsed.hostname.includes(".")) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Só estes dois aceitam o texto da pergunta por endereço. Nos demais, o texto é copiado e o site é aberto.
const PROMPT_ENDPOINTS: Record<string, string> = {
  "claude.ai": "https://claude.ai/new?q=",
  "chatgpt.com": "https://chatgpt.com/?q=",
};

export function buildAskTarget(url: string, prompt: string): { url: string; prefilled: boolean } {
  const text = prompt.trim();
  const endpoint = PROMPT_ENDPOINTS[hostOf(url)];
  if (endpoint && text) return { url: `${endpoint}${encodeURIComponent(text).slice(0, 4000)}`, prefilled: true };
  return { url, prefilled: false };
}

export type LauncherItem = {
  id: number;
  name: string;
  url: string;
  kind: ShortcutKind;
  pinned: boolean;
  openCount: number;
  lastOpenedAt: Date | string | null;
};

const time = (value: Date | string | null) => (value ? new Date(value).getTime() : 0);

/** Fixados primeiro (por nome); depois os mais usados recentemente. */
export function quickAccess<T extends LauncherItem>(items: T[], limit = 8): T[] {
  const pinned = items.filter(item => item.pinned).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return pinned.slice(0, limit);
}

export function recentlyUsed<T extends LauncherItem>(items: T[], limit = 4): T[] {
  return items
    .filter(item => item.lastOpenedAt && !item.pinned)
    .sort((a, b) => time(b.lastOpenedAt) - time(a.lastOpenedAt))
    .slice(0, limit);
}

export function groupByKind<T extends LauncherItem>(items: T[]): { kind: ShortcutKind; label: string; items: T[] }[] {
  return SHORTCUT_KINDS.map(kind => ({
    kind,
    label: KIND_LABELS[kind],
    items: items.filter(item => item.kind === kind).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name, "pt-BR")),
  })).filter(group => group.items.length > 0);
}

export function matchesSearch(item: { name: string; url: string; description?: string | null; category?: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${item.name} ${item.description ?? ""} ${item.category ?? ""} ${hostOf(item.url)}`.toLowerCase().includes(q);
}
