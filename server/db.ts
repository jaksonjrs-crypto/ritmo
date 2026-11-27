import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  calendarEvents,
  contentItems,
  hubSettings,
  InsertUser,
  projects,
  resultMetrics,
  ReviewChecklist,
  shortcuts,
  tasks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hostOf, LAUNCHER_SEEDS, type ShortcutKind } from "../shared/launcher";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("Database is not available");
    return db;
  });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const fields = ["name", "email", "loginMethod"] as const;
  fields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = new Date();
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const [result] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result;
}

const emptyChecklist: ReviewChecklist = {
  copyReviewed: false,
  creativeVerified: false,
  channelVerified: false,
  dateVerified: false,
  linkVerified: false,
  offerVerified: false,
};

export async function ensureStarterData(userId: number) {
  const db = await requireDb();
  // Duas chamadas ao mesmo tempo (painel + exportação) não podem duplicar os projetos iniciais:
  // a linha de ajustes é criada sem erro se já existir e o "claim" abaixo só funciona uma vez.
  await db.insert(hubSettings).values({ userId, weeklyCapacityMinutes: null })
    .onDuplicateKeyUpdate({ set: { userId } });

  const [claim] = await db.update(hubSettings).set({ starterSeeded: true })
    .where(and(eq(hubSettings.userId, userId), eq(hubSettings.starterSeeded, false)));
  if (claim.affectedRows === 1) {
    try {
      await db.insert(projects).values([
        {
          userId,
          name: "Divulgação do e-book KDP",
          category: "E-book · Amazon KDP",
          status: "active",
          description: "Foco atual. Você relatou que uma skill no Claude prepara o conteúdo semanal para Instagram e Facebook até 1º de janeiro. A conferência e qualquer agendamento continuam manuais.",
          nextAction: "Conferir a próxima publicação antes de agendar manualmente.",
        },
        {
          userId,
          name: "E-book Hotmart",
          category: "Produto digital",
          status: "active",
          description: "E-book já lançado na Hotmart. Registre aqui próximos passos e resultados quando quiser.",
          nextAction: null,
        },
        {
          userId,
          name: "Garimpo de produtos e vitrine",
          category: "Ferramenta própria",
          status: "active",
          description: "Ferramenta existente que faz o garimpo de produtos e publica na sua vitrine.",
          nextAction: null,
        },
        {
          userId,
          name: "Canais de música para relaxar e dormir",
          category: "YouTube",
          status: "active",
          description: "Projeto dos canais de músicas para relaxar e dormir. Complete detalhes e próximos passos quando for útil.",
          nextAction: null,
        },
      ]);
    } catch (error) {
      await db.update(hubSettings).set({ starterSeeded: false }).where(eq(hubSettings.userId, userId));
      throw error;
    }
  }

  await ensureLauncherSeeded(userId);
}

/**
 * V2.0: preenche o lançador com IAs, apps e sites. Roda uma única vez por conta (mesmo claim atômico).
 * Atalhos que o usuário já tinha são mantidos; só ganham tipo/fixação quando ainda estão no padrão.
 */
async function ensureLauncherSeeded(userId: number) {
  const db = await requireDb();
  const [claim] = await db.update(hubSettings).set({ launcherSeeded: true })
    .where(and(eq(hubSettings.userId, userId), eq(hubSettings.launcherSeeded, false)));
  if (claim.affectedRows !== 1) return;
  try {
    const existing = await db.select().from(shortcuts).where(eq(shortcuts.userId, userId));
    const byHost = new Map(existing.map(row => [hostOf(row.url), row]));
    const missing: (typeof shortcuts.$inferInsert)[] = [];
    for (const seed of LAUNCHER_SEEDS) {
      const found = byHost.get(hostOf(seed.url));
      if (!found) {
        missing.push({ userId, name: seed.name, url: seed.url, kind: seed.kind, category: seed.category, emoji: seed.emoji, description: seed.description, pinned: seed.pinned });
      } else if (found.kind === "tool" && !found.pinned && seed.kind !== "tool") {
        await db.update(shortcuts).set({ kind: seed.kind, pinned: seed.pinned, emoji: found.emoji ?? seed.emoji, description: found.description ?? seed.description })
          .where(and(eq(shortcuts.id, found.id), eq(shortcuts.userId, userId)));
      }
    }
    if (missing.length) await db.insert(shortcuts).values(missing);
  } catch (error) {
    await db.update(hubSettings).set({ launcherSeeded: false }).where(eq(hubSettings.userId, userId));
    throw error;
  }
}

export async function getWorkspace(userId: number) {
  await ensureStarterData(userId);
  const db = await requireDb();
  const [projectRows, taskRows, contentRows, eventRows, resultRows, shortcutRows, settingsRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.name)),
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.dueDate), desc(tasks.createdAt)),
    db.select().from(contentItems).where(eq(contentItems.userId, userId)).orderBy(asc(contentItems.plannedAt), desc(contentItems.createdAt)),
    db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(asc(calendarEvents.startsAt)),
    db.select().from(resultMetrics).where(eq(resultMetrics.userId, userId)).orderBy(desc(resultMetrics.recordedOn)),
    db.select().from(shortcuts).where(eq(shortcuts.userId, userId)).orderBy(desc(shortcuts.pinned), asc(shortcuts.name)),
    db.select().from(hubSettings).where(eq(hubSettings.userId, userId)).limit(1),
  ]);
  return {
    projects: projectRows,
    tasks: taskRows,
    content: contentRows,
    events: eventRows,
    results: resultRows,
    shortcuts: shortcutRows,
    settings: settingsRows[0] ?? null,
  };
}

export async function updateCapacity(userId: number, weeklyCapacityMinutes: number | null) {
  await ensureStarterData(userId);
  const db = await requireDb();
  await db.update(hubSettings).set({ weeklyCapacityMinutes }).where(eq(hubSettings.userId, userId));
}

async function belongsToProject(userId: number, projectId: number | null | undefined) {
  if (projectId == null) return true;
  const db = await requireDb();
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return Boolean(project);
}

export async function createProject(userId: number, input: {
  name: string; category: string; description?: string; nextAction?: string;
}) {
  const db = await requireDb();
  await db.insert(projects).values({ userId, ...input, status: "active" });
}

export async function updateProject(userId: number, input: {
  id: number; name?: string; category?: string; description?: string | null; nextAction?: string | null; status?: "active" | "paused" | "completed";
}) {
  const db = await requireDb();
  const { id, ...patch } = input;
  await db.update(projects).set(patch).where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function createTask(userId: number, input: {
  projectId?: number | null; title: string; notes?: string; status?: "todo" | "doing" | "done";
  priority?: "low" | "normal" | "high"; dueDate?: string | null; estimateMinutes?: number;
}) {
  if (!(await belongsToProject(userId, input.projectId))) return false;
  const db = await requireDb();
  await db.insert(tasks).values({ userId, ...input, projectId: input.projectId ?? null });
  return true;
}

export async function updateTask(userId: number, input: {
  id: number; projectId?: number | null; title?: string; notes?: string | null;
  status?: "todo" | "doing" | "done"; priority?: "low" | "normal" | "high";
  dueDate?: string | null; estimateMinutes?: number;
}) {
  if (input.projectId !== undefined && !(await belongsToProject(userId, input.projectId))) return false;
  const db = await requireDb();
  const { id, ...patch } = input;
  await db.update(tasks).set(patch).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  const [row] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).limit(1);
  return Boolean(row);
}

export async function deleteTask(userId: number, id: number) {
  const db = await requireDb();
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function createContent(userId: number, input: {
  projectId?: number | null; productName: string; title: string; objective?: string;
  channels: string[]; plannedAt?: Date | null; notes?: string;
}) {
  if (!(await belongsToProject(userId, input.projectId))) return false;
  const db = await requireDb();
  await db.insert(contentItems).values({
    userId,
    ...input,
    projectId: input.projectId ?? null,
    channels: input.channels,
    plannedAt: input.plannedAt ?? null,
    status: "product_selected",
    reviewChecklist: emptyChecklist,
    approvedAt: null,
  });
  return true;
}

export async function updateContent(userId: number, input: {
  id: number; projectId?: number | null; productName?: string; title?: string;
  objective?: string | null; channels?: string[]; plannedAt?: Date | null; notes?: string | null;
}) {
  if (input.projectId !== undefined && !(await belongsToProject(userId, input.projectId))) return false;
  const db = await requireDb();
  const [current] = await db.select().from(contentItems)
    .where(and(eq(contentItems.id, input.id), eq(contentItems.userId, userId))).limit(1);
  if (!current) return false;
  const { id, ...patch } = input;
  const previouslyApproved = ["approved", "scheduled_manual", "published", "measuring"].includes(current.status);
  await db.update(contentItems).set({
    ...patch,
    contentRevision: sql`${contentItems.contentRevision} + 1`,
    ...(current.status === "review"
      ? { status: "editing" as const, approvedAt: null, reviewChecklist: emptyChecklist }
      : previouslyApproved
        ? { status: "review" as const, approvedAt: null, reviewChecklist: emptyChecklist }
        : {}),
  }).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
  return true;
}

export async function approveContent(userId: number, input: { id: number; reviewRevision: number; checklist: ReviewChecklist }) {
  const checklistValues = Object.values(input.checklist);
  if (checklistValues.length !== 6 || checklistValues.some(value => value !== true)) return false;
  const db = await requireDb();
  const [current] = await db.select().from(contentItems)
    .where(and(eq(contentItems.id, input.id), eq(contentItems.userId, userId))).limit(1);
  if (!current) return null;
  if (current.status !== "review" || current.contentRevision !== input.reviewRevision) return false;
  const [result] = await db.update(contentItems).set({
    status: "approved",
    reviewChecklist: input.checklist,
    approvedAt: new Date(),
  }).where(and(
    eq(contentItems.id, input.id),
    eq(contentItems.userId, userId),
    eq(contentItems.status, "review"),
    eq(contentItems.contentRevision, input.reviewRevision),
  ));
  return result.affectedRows === 1;
}

const contentOrder = ["product_selected", "brief", "script", "recording", "editing", "review", "approved", "scheduled_manual", "published", "measuring"] as const;
type ContentStatus = (typeof contentOrder)[number];
export async function moveContent(userId: number, input: { id: number; status: ContentStatus }) {
  const db = await requireDb();
  const [current] = await db.select().from(contentItems)
    .where(and(eq(contentItems.id, input.id), eq(contentItems.userId, userId))).limit(1);
  if (!current) return null;
  if (input.status === "approved") return false;
  const currentIndex = contentOrder.indexOf(current.status);
  const nextIndex = contentOrder.indexOf(input.status);
  if (nextIndex >= 7 && !current.approvedAt) return false;
  if (input.status === "published" && current.status !== "scheduled_manual") return false;
  if (input.status === "measuring" && current.status !== "published") return false;
  if (input.status === "scheduled_manual" && current.status !== "approved") return false;
  if (nextIndex < 7 && currentIndex >= 7) {
    await db.update(contentItems).set({
      status: input.status,
      approvedAt: null,
      reviewChecklist: emptyChecklist,
      contentRevision: sql`${contentItems.contentRevision} + 1`,
    })
      .where(and(eq(contentItems.id, input.id), eq(contentItems.userId, userId)));
  } else {
    await db.update(contentItems).set({
      status: input.status,
      contentRevision: sql`${contentItems.contentRevision} + 1`,
    })
      .where(and(eq(contentItems.id, input.id), eq(contentItems.userId, userId)));
  }
  return true;
}

export async function createEvent(userId: number, input: {
  projectId?: number | null; title: string; kind: "work" | "content" | "personal" | "rest";
  startsAt: Date; endsAt?: Date | null; notes?: string;
}) {
  if (!(await belongsToProject(userId, input.projectId))) return false;
  const db = await requireDb();
  await db.insert(calendarEvents).values({ ...input, userId, projectId: input.projectId ?? null, endsAt: input.endsAt ?? null });
  return true;
}

export async function deleteEvent(userId: number, id: number) {
  const db = await requireDb();
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

export async function createResult(userId: number, input: {
  projectId?: number | null; contentId?: number | null; metricName: string;
  metricValue: string; recordedOn: string; notes?: string;
}) {
  if (!input.projectId && !input.contentId) return false;
  const db = await requireDb();
  if (input.projectId && !(await belongsToProject(userId, input.projectId))) return false;
  if (input.contentId) {
    const [content] = await db.select({ id: contentItems.id }).from(contentItems)
      .where(and(eq(contentItems.id, input.contentId), eq(contentItems.userId, userId))).limit(1);
    if (!content) return false;
  }
  await db.insert(resultMetrics).values({ ...input, userId, projectId: input.projectId ?? null, contentId: input.contentId ?? null });
  return true;
}

export type ShortcutInput = {
  name: string; url: string; category: string; kind: ShortcutKind;
  description?: string | null; emoji?: string | null; pinned?: boolean;
};

export async function createShortcut(userId: number, input: ShortcutInput) {
  const db = await requireDb();
  await db.insert(shortcuts).values({
    userId, ...input,
    description: input.description || null,
    emoji: input.emoji || null,
    pinned: input.pinned ?? false,
  });
}

export async function updateShortcut(userId: number, input: Partial<ShortcutInput> & { id: number }) {
  const db = await requireDb();
  const { id, ...patch } = input;
  if (Object.keys(patch).length === 0) return true;
  const [result] = await db.update(shortcuts).set({
    ...patch,
    ...(patch.description !== undefined ? { description: patch.description || null } : {}),
    ...(patch.emoji !== undefined ? { emoji: patch.emoji || null } : {}),
  }).where(and(eq(shortcuts.id, id), eq(shortcuts.userId, userId)));
  return result.affectedRows >= 1;
}

export async function touchShortcut(userId: number, id: number) {
  const db = await requireDb();
  await db.update(shortcuts).set({ openCount: sql`${shortcuts.openCount} + 1`, lastOpenedAt: new Date() })
    .where(and(eq(shortcuts.id, id), eq(shortcuts.userId, userId)));
}

export async function deleteShortcut(userId: number, id: number) {
  const db = await requireDb();
  await db.delete(shortcuts).where(and(eq(shortcuts.id, id), eq(shortcuts.userId, userId)));
}

export async function exportWorkspace(userId: number) {
  return getWorkspace(userId);
}
