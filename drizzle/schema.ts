import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("Pessoal"),
  status: mysqlEnum("status", ["active", "paused", "completed"]).notNull().default("active"),
  description: text("description"),
  nextAction: varchar("nextAction", { length: 240 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 220 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["todo", "doing", "done"]).notNull().default("todo"),
  priority: mysqlEnum("priority", ["low", "normal", "high"]).notNull().default("normal"),
  dueDate: varchar("dueDate", { length: 10 }),
  estimateMinutes: int("estimateMinutes").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewChecklist = {
  copyReviewed: boolean;
  creativeVerified: boolean;
  channelVerified: boolean;
  dateVerified: boolean;
  linkVerified: boolean;
  offerVerified: boolean;
};

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  productName: varchar("productName", { length: 180 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  objective: varchar("objective", { length: 180 }),
  channels: json("channels").$type<string[]>().notNull(),
  plannedAt: timestamp("plannedAt"),
  status: mysqlEnum("status", [
    "product_selected",
    "brief",
    "script",
    "recording",
    "editing",
    "review",
    "approved",
    "scheduled_manual",
    "published",
    "measuring",
  ]).notNull().default("product_selected"),
  reviewChecklist: json("reviewChecklist").$type<ReviewChecklist>().notNull(),
  contentRevision: int("contentRevision").notNull().default(0),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 180 }).notNull(),
  kind: mysqlEnum("kind", ["work", "content", "personal", "rest"]).notNull().default("work"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resultMetrics = mysqlTable("result_metrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  contentId: int("contentId").references(() => contentItems.id, { onDelete: "set null" }),
  metricName: varchar("metricName", { length: 120 }).notNull(),
  metricValue: varchar("metricValue", { length: 120 }).notNull(),
  recordedOn: varchar("recordedOn", { length: 10 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shortcuts = mysqlTable("shortcuts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("Ferramenta"),
  kind: mysqlEnum("kind", ["ai", "app", "site", "social", "tool"]).notNull().default("tool"),
  description: varchar("description", { length: 200 }),
  emoji: varchar("emoji", { length: 8 }),
  pinned: boolean("pinned").notNull().default(false),
  openCount: int("openCount").notNull().default(0),
  lastOpenedAt: timestamp("lastOpenedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const hubSettings = mysqlTable("hub_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  weeklyCapacityMinutes: int("weeklyCapacityMinutes"),
  starterSeeded: boolean("starterSeeded").notNull().default(false),
  launcherSeeded: boolean("launcherSeeded").notNull().default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
