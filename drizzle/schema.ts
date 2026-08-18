import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamptz("lastSignedIn").defaultNow().notNull(),
});

export const dataAssets = pgTable("data_assets", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  source: varchar("source", { length: 32 }).$type<"OneDrive" | "Slack" | "Outlook">().notNull(),
  content: text("content").notNull(),
  contentHash: varchar("contentHash", { length: 128 }).notNull(),
  status: varchar("status", { length: 16 }).$type<"active" | "remediated">().default("active").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const policyDocuments = pgTable("policy_documents", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  framework: varchar("framework", { length: 32 }).$type<"ICRC" | "GDPR" | "Sphere Standards">().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  citation: varchar("citation", { length: 255 }).notNull(),
  excerpt: text("excerpt").notNull(),
  keywords: text("keywords").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
});

export const findings = pgTable("findings", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  assetId: integer("assetId").notNull(),
  severity: varchar("severity", { length: 16 }).$type<"low" | "medium" | "high" | "critical">().notNull(),
  piiTypes: text("piiTypes").notNull(),
  evidence: text("evidence").notNull(),
  summary: text("summary").notNull(),
  status: varchar("status", { length: 16 }).$type<"open" | "approved" | "remediated">().default("open").notNull(),
  recurrence: integer("recurrence").default(0).notNull(),
  priorFindingId: integer("priorFindingId"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const findingPolicies = pgTable("finding_policies", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  findingId: integer("findingId").notNull(),
  policyId: integer("policyId").notNull(),
  relevance: integer("relevance").default(0).notNull(),
});

export const approvals = pgTable("approvals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  findingId: integer("findingId").notNull(),
  decision: varchar("decision", { length: 16 }).$type<"approved" | "rejected">().notNull(),
  action: varchar("action", { length: 32 }).$type<"redact" | "revoke_access">().notNull(),
  note: text("note"),
  approvedBy: integer("approvedBy"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
});

export const remediationActions = pgTable("remediation_actions", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  findingId: integer("findingId").notNull(),
  action: varchar("action", { length: 32 }).$type<"redact" | "revoke_access">().notNull(),
  beforeHash: varchar("beforeHash", { length: 128 }).notNull(),
  afterHash: varchar("afterHash", { length: 128 }).notNull(),
  result: text("result").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
});

export const agentEvents = pgTable("agent_events", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  findingId: integer("findingId"),
  assetId: integer("assetId"),
  payload: text("payload").notNull(),
  previousHash: varchar("previousHash", { length: 128 }).notNull(),
  eventHash: varchar("eventHash", { length: 128 }).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DataAsset = typeof dataAssets.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type PolicyDocument = typeof policyDocuments.$inferSelect;
export type AgentEvent = typeof agentEvents.$inferSelect;
