import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agentEvents,
  approvals,
  dataAssets,
  findingPolicies,
  findings,
  policyDocuments,
  remediationActions,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function computeEventHash(previousHash: string, eventType: string, findingId: number | undefined, assetId: number | undefined, payload: string) { return sha256([previousHash, eventType, findingId ?? '', assetId ?? '', payload].join('|')); }
export function requireApprovedAction(approved: boolean) { if (!approved) throw new Error('Approval required before destructive action'); }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (['name', 'email', 'loginMethod'] as const).forEach(field => { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = values[field]; } });
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0];
}

const POLICY_SEEDS = [
  { framework: 'ICRC' as const, title: 'ICRC Professional Standards for Protection Work', citation: 'ICRC Professional Standards, data protection and confidentiality', excerpt: 'Personal data collected for protection work must be processed lawfully, securely, confidentially, and only for specified humanitarian purposes. Access should be limited to those who need it.', keywords: 'confidentiality, protection, humanitarian, access, purpose limitation, sensitive data' },
  { framework: 'GDPR' as const, title: 'GDPR Article 5 Principles', citation: 'GDPR Art. 5(1)(c)-(f)', excerpt: 'Personal data must be adequate, relevant and limited to what is necessary; accurate; kept no longer than necessary; and processed with integrity and confidentiality using appropriate security.', keywords: 'data minimisation, retention, integrity, confidentiality, security, personal data' },
  { framework: 'GDPR' as const, title: 'GDPR Article 32 Security of Processing', citation: 'GDPR Art. 32', excerpt: 'Controllers and processors must implement appropriate technical and organisational measures, including encryption, resilience, restoration, and regular testing of security controls.', keywords: 'security, encryption, resilience, access control, breach, processing' },
  { framework: 'Sphere Standards' as const, title: 'Sphere Humanitarian Protection Principles', citation: 'Sphere Handbook, Protection Principle 1', excerpt: 'Humanitarian actors should avoid exposing people to further harm and should protect people from physical and psychological harm, including risks created by information handling.', keywords: 'do no harm, protection, dignity, risk, humanitarian, affected people' },
  { framework: 'Sphere Standards' as const, title: 'Sphere Core Humanitarian Standard', citation: 'Sphere Handbook, CHS Commitment 4', excerpt: 'People affected by crisis have access to safe, responsive mechanisms for handling data, feedback, complaints, and sensitive information with respect and confidentiality.', keywords: 'accountability, confidentiality, feedback, sensitive information, affected people' },
];

export async function ensurePolicies() {
  const db = await getDb(); if (!db) return;
  const existing = await db.select({ id: policyDocuments.id }).from(policyDocuments).limit(1); if (existing.length) return;
  await db.insert(policyDocuments).values(POLICY_SEEDS);
}

export async function listPolicies() { const db = await getDb(); if (!db) return []; await ensurePolicies(); return db.select().from(policyDocuments); }

export async function getDashboardData() {
  const db = await getDb(); if (!db) return { assets: [], findings: [], approvals: [], events: [], policies: [] };
  await ensurePolicies();
  const [assets, findingRows, approvalRows, events, policies, links] = await Promise.all([
    db.select().from(dataAssets).orderBy(desc(dataAssets.createdAt)),
    db.select().from(findings).orderBy(desc(findings.createdAt)),
    db.select().from(approvals).orderBy(desc(approvals.createdAt)),
    db.select().from(agentEvents).orderBy(desc(agentEvents.createdAt)).limit(80),
    db.select().from(policyDocuments),
    db.select().from(findingPolicies),
  ]);
  const assetMap = new Map(assets.map(asset => [asset.id, asset]));
  const enrichedFindings = findingRows.map(finding => ({ ...finding, source: assetMap.get(finding.assetId)?.source ?? "OneDrive", assetName: assetMap.get(finding.assetId)?.name ?? "Unknown asset" }));
  const policyMap = Object.fromEntries(findingRows.map(finding => [finding.id, links.filter(link => link.findingId === finding.id).map(link => policies.find(policy => policy.id === link.policyId)).filter(Boolean)]));
  return { assets, findings: enrichedFindings, approvals: approvalRows, events, policies, policyMap };
}

export async function appendEvent(input: { eventType: string; findingId?: number; assetId?: number; payload: unknown }) {
  const db = await getDb(); if (!db) return null;
  const prior = await db.select().from(agentEvents).orderBy(desc(agentEvents.id)).limit(1);
  const previousHash = prior[0]?.eventHash ?? 'GENESIS';
  const payload = JSON.stringify(input.payload);
  const eventHash = computeEventHash(previousHash, input.eventType, input.findingId, input.assetId, payload);
  const result = await db.insert(agentEvents).values({ eventType: input.eventType, findingId: input.findingId, assetId: input.assetId, payload, previousHash, eventHash });
  return { id: result[0].insertId, eventHash, previousHash };
}

export async function findPriorRemediated(assetHash: string) {
  const db = await getDb(); if (!db) return undefined;
  const asset = await db.select().from(dataAssets).where(and(eq(dataAssets.contentHash, assetHash), eq(dataAssets.status, 'remediated'))).orderBy(desc(dataAssets.createdAt)).limit(1);
  if (!asset[0]) return undefined;
  const prior = await db.select().from(findings).where(and(eq(findings.assetId, asset[0].id), eq(findings.status, 'remediated'))).orderBy(desc(findings.createdAt)).limit(1);
  return prior[0];
}

export async function saveScan(input: { name: string; source: 'OneDrive' | 'Slack' | 'Outlook'; content: string; contentHash: string; severity: 'low' | 'medium' | 'high' | 'critical'; piiTypes: string[]; evidence: string[]; summary: string; priorFindingId?: number; recurrence: number; policyIds: number[] }) {
  const db = await getDb(); if (!db) throw new Error('Database unavailable');
  const assetInsert = await db.insert(dataAssets).values({ name: input.name, source: input.source, content: input.content, contentHash: input.contentHash });
  const assetId = assetInsert[0].insertId;
  const findingInsert = await db.insert(findings).values({ assetId, severity: input.severity, piiTypes: JSON.stringify(input.piiTypes), evidence: JSON.stringify(input.evidence), summary: input.summary, recurrence: input.recurrence, priorFindingId: input.priorFindingId });
  const findingId = findingInsert[0].insertId;
  if (input.policyIds.length) await db.insert(findingPolicies).values(input.policyIds.map(policyId => ({ findingId, policyId, relevance: 100 })));
  await appendEvent({ eventType: 'scan.completed', assetId, findingId, payload: { name: input.name, source: input.source, piiTypes: input.piiTypes, recurrence: input.recurrence } });
  return { assetId, findingId };
}

export async function approveFinding(findingId: number, action: 'redact' | 'revoke_access', approvedBy?: number, note?: string) {
  const db = await getDb(); if (!db) throw new Error('Database unavailable');
  await db.insert(approvals).values({ findingId, action, decision: 'approved', approvedBy, note });
  await db.update(findings).set({ status: 'approved' }).where(eq(findings.id, findingId));
  await appendEvent({ eventType: 'approval.granted', findingId, payload: { action, note } });
}

export async function remediateFinding(findingId: number, action: 'redact' | 'revoke_access') {
  const db = await getDb(); if (!db) throw new Error('Database unavailable');
  const finding = (await db.select().from(findings).where(eq(findings.id, findingId)).limit(1))[0]; if (!finding) throw new Error('Finding not found');
  const approved = await db.select().from(approvals).where(and(eq(approvals.findingId, findingId), eq(approvals.decision, 'approved'), eq(approvals.action, action))).limit(1);
  requireApprovedAction(Boolean(approved[0]));
  const asset = (await db.select().from(dataAssets).where(eq(dataAssets.id, finding.assetId)).limit(1))[0]; if (!asset) throw new Error('Asset not found');
  const beforeHash = sha256(asset.content);
  const afterContent = action === 'redact' ? asset.content.replace(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, '[REDACTED NAME]').replace(/\b(?:CASE|case)[-_ ]?\d{3,}\b/g, '[REDACTED CASE]').replace(/\b-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}\b/g, '[REDACTED GPS]').replace(/\b(?:diabetes|HIV|malaria|pregnant|medical)\b/gi, '[REDACTED MEDICAL]') : `${asset.content}\n[ACCESS REVOKED]`;
  const afterHash = sha256(afterContent);
  await db.update(dataAssets).set({ content: afterContent, status: 'remediated' }).where(eq(dataAssets.id, asset.id));
  await db.insert(remediationActions).values({ findingId, action, beforeHash, afterHash, result: action === 'redact' ? 'PII tokens redacted from stored content' : 'Sharing marked as revoked' });
  await db.update(findings).set({ status: 'remediated' }).where(eq(findings.id, findingId));
  await appendEvent({ eventType: 'remediation.completed', findingId, assetId: asset.id, payload: { action, beforeHash, afterHash } });
  return { action, beforeHash, afterHash, content: afterContent };
}
