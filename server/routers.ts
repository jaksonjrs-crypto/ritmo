import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { normalizeHttpsUrl, SHORTCUT_KINDS } from "../shared/launcher";
import * as db from "./db";

const channelValues = ["Instagram", "Facebook", "TikTok", "YouTube", "Pinterest", "Shopee Vídeos", "Telegram"] as const;
const projectStatus = z.enum(["active", "paused", "completed"]);
const taskStatus = z.enum(["todo", "doing", "done"]);
const contentStatus = z.enum(["product_selected", "brief", "script", "recording", "editing", "review", "approved", "scheduled_manual", "published", "measuring"]);
const dateInput = z.date().nullable().optional();
const safeOptionalId = z.number().int().positive().nullable().optional();

function assertOwned(ok: boolean) {
  if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado ou não pertence à sua conta." });
}

function httpsOrThrow(url: string) {
  const normalized = normalizeHttpsUrl(url);
  if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "Use um endereço HTTPS válido, como claude.ai ou https://claude.ai." });
  return normalized;
}

const shortcutFields = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().min(3).max(1000),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).nullable().optional(),
  emoji: z.string().trim().max(8).nullable().optional(),
  pinned: z.boolean().optional(),
});

const checklistSchema = z.object({
  copyReviewed: z.boolean(),
  creativeVerified: z.boolean(),
  channelVerified: z.boolean(),
  dateVerified: z.boolean(),
  linkVerified: z.boolean(),
  offerVerified: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  hub: router({
    workspace: ownerProcedure.query(({ ctx }) => db.getWorkspace(ctx.user.id)),
    export: ownerProcedure.query(({ ctx }) => db.exportWorkspace(ctx.user.id)),
    setCapacity: ownerProcedure.input(z.object({ weeklyCapacityMinutes: z.number().int().min(60).max(100 * 60).nullable() }))
      .mutation(({ ctx, input }) => db.updateCapacity(ctx.user.id, input.weeklyCapacityMinutes)),
    createProject: ownerProcedure.input(z.object({
      name: z.string().trim().min(1).max(160),
      category: z.string().trim().min(1).max(80),
      description: z.string().max(5000).optional(),
      nextAction: z.string().max(240).optional(),
    })).mutation(({ ctx, input }) => db.createProject(ctx.user.id, input)),
    updateProject: ownerProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(160).optional(),
      category: z.string().trim().min(1).max(80).optional(),
      description: z.string().max(5000).nullable().optional(),
      nextAction: z.string().max(240).nullable().optional(),
      status: projectStatus.optional(),
    })).mutation(({ ctx, input }) => db.updateProject(ctx.user.id, input)),
    createTask: ownerProcedure.input(z.object({
      projectId: safeOptionalId,
      title: z.string().trim().min(1).max(220),
      notes: z.string().max(5000).optional(),
      status: taskStatus.optional(),
      priority: z.enum(["low", "normal", "high"]).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      estimateMinutes: z.number().int().min(0).max(10000).optional(),
    })).mutation(async ({ ctx, input }) => assertOwned(await db.createTask(ctx.user.id, input))),
    updateTask: ownerProcedure.input(z.object({
      id: z.number().int().positive(),
      projectId: safeOptionalId,
      title: z.string().trim().min(1).max(220).optional(),
      notes: z.string().max(5000).nullable().optional(),
      status: taskStatus.optional(),
      priority: z.enum(["low", "normal", "high"]).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      estimateMinutes: z.number().int().min(0).max(10000).optional(),
    })).mutation(async ({ ctx, input }) => assertOwned(await db.updateTask(ctx.user.id, input))),
    deleteTask: ownerProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.deleteTask(ctx.user.id, input.id)),
    createContent: ownerProcedure.input(z.object({
      projectId: safeOptionalId,
      productName: z.string().trim().min(1).max(180),
      title: z.string().trim().min(1).max(220),
      objective: z.string().max(180).optional(),
      channels: z.array(z.enum(channelValues)).min(1).max(channelValues.length),
      plannedAt: dateInput,
      notes: z.string().max(5000).optional(),
    })).mutation(async ({ ctx, input }) => assertOwned(await db.createContent(ctx.user.id, input))),
    updateContent: ownerProcedure.input(z.object({
      id: z.number().int().positive(),
      projectId: safeOptionalId,
      productName: z.string().trim().min(1).max(180).optional(),
      title: z.string().trim().min(1).max(220).optional(),
      objective: z.string().max(180).nullable().optional(),
      channels: z.array(z.enum(channelValues)).min(1).max(channelValues.length).optional(),
      plannedAt: dateInput,
      notes: z.string().max(5000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => assertOwned(await db.updateContent(ctx.user.id, input))),
    approveContent: ownerProcedure.input(z.object({
      id: z.number().int().positive(),
      reviewRevision: z.number().int().nonnegative(),
      checklist: checklistSchema,
    }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.approveContent(ctx.user.id, input);
        if (result === null) throw new TRPCError({ code: "NOT_FOUND", message: "Conteúdo não encontrado." });
        if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "O conteúdo mudou desde que você abriu a revisão. Confira os dados atualizados antes de aprovar." });
        return { approved: true, approvedAt: new Date() };
      }),
    moveContent: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: contentStatus }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.moveContent(ctx.user.id, input);
        if (result === null) throw new TRPCError({ code: "NOT_FOUND", message: "Conteúdo não encontrado." });
        if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "Essa etapa exige aprovação humana anterior e registro manual na plataforma externa." });
        return { success: true };
      }),
    createEvent: ownerProcedure.input(z.object({
      projectId: safeOptionalId,
      title: z.string().trim().min(1).max(180),
      kind: z.enum(["work", "content", "personal", "rest"]),
      startsAt: z.date(),
      endsAt: z.date().nullable().optional(),
      notes: z.string().max(5000).optional(),
    })).mutation(async ({ ctx, input }) => assertOwned(await db.createEvent(ctx.user.id, input))),
    deleteEvent: ownerProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.deleteEvent(ctx.user.id, input.id)),
    createResult: ownerProcedure.input(z.object({
      projectId: safeOptionalId,
      contentId: safeOptionalId,
      metricName: z.string().trim().min(1).max(120),
      metricValue: z.string().trim().min(1).max(120),
      recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().max(5000).optional(),
    })).mutation(async ({ ctx, input }) => assertOwned(await db.createResult(ctx.user.id, input))),
    createShortcut: ownerProcedure.input(shortcutFields.extend({ kind: z.enum(SHORTCUT_KINDS).default("tool") }))
      .mutation(({ ctx, input }) => db.createShortcut(ctx.user.id, { ...input, url: httpsOrThrow(input.url) })),
    updateShortcut: ownerProcedure.input(shortcutFields.partial().extend({ id: z.number().int().positive(), kind: z.enum(SHORTCUT_KINDS).optional() }))
      .mutation(async ({ ctx, input }) => assertOwned(await db.updateShortcut(ctx.user.id, { ...input, url: input.url === undefined ? undefined : httpsOrThrow(input.url) }))),
    openShortcut: ownerProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.touchShortcut(ctx.user.id, input.id)),
    deleteShortcut: ownerProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.deleteShortcut(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
