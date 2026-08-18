import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const dataAssets = mysqlTable("data_assets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["OneDrive", "Slack", "Outlook"]).notNull(),
  content: text("content").notNull(),
  contentHash: varchar("contentHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["active", "remediated"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const policyDocuments = mysqlTable("policy_documents", {
  id: int("id").autoincrement().primaryKey(),
  framework: mysqlEnum("framework", ["ICRC", "GDPR", "Sphere Standards"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  citation: varchar("citation", { length: 255 }).notNull(),
  excerpt: text("excerpt").notNull(),
  keywords: text("keywords").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const findings = mysqlTable("findings", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  piiTypes: text("piiTypes").notNull(),
  evidence: text("evidence").notNull(),
  summary: text("summary").notNull(),
  status: mysqlEnum("status", ["open", "approved", "remediated"]).default("open").notNull(),
  recurrence: int("recurrence").default(0).notNull(),
  priorFindingId: int("priorFindingId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const findingPolicies = mysqlTable("finding_policies", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  policyId: int("policyId").notNull(),
  relevance: int("relevance").default(0).notNull(),
});

export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  decision: mysqlEnum("decision", ["approved", "rejected"]).notNull(),
  action: mysqlEnum("action", ["redact", "revoke_access"]).notNull(),
  note: text("note"),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const remediationActions = mysqlTable("remediation_actions", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  action: mysqlEnum("action", ["redact", "revoke_access"]).notNull(),
  beforeHash: varchar("beforeHash", { length: 128 }).notNull(),
  afterHash: varchar("afterHash", { length: 128 }).notNull(),
  result: text("result").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const agentEvents = mysqlTable("agent_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  findingId: int("findingId"),
  assetId: int("assetId"),
  payload: text("payload").notNull(),
  previousHash: varchar("previousHash", { length: 128 }).notNull(),
  eventHash: varchar("eventHash", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DataAsset = typeof dataAssets.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type PolicyDocument = typeof policyDocuments.$inferSelect;
export type AgentEvent = typeof agentEvents.$inferSelect;
