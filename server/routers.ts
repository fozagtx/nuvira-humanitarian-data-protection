import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { appendEvent, approveFinding, ensurePolicies, findPriorRemediated, getDashboardData, getDb, listPolicies, remediateFinding, saveScan, sha256 } from "./db";

const sourceSchema = z.enum(["OneDrive", "Slack", "Outlook"]);
const actionSchema = z.enum(["redact", "revoke_access"]);
type Source = "OneDrive" | "Slack" | "Outlook";
export function escalateSeverity(severity: "low" | "medium" | "high" | "critical", recurring: boolean) { return recurring && severity !== "critical" ? "critical" : severity; }

export function classifyHeuristically(content: string) {
  const patterns: Array<{ type: string; regex: RegExp }> = [
    { type: "names", regex: /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g },
    { type: "case numbers", regex: /\b(?:CASE|case)[-_ ]?\d{3,}\b/g },
    { type: "GPS coordinates", regex: /\b-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}\b/g },
    { type: "medical data", regex: /\b(?:diabetes|HIV|malaria|pregnant|medical|diagnosis|medication)\b/gi },
  ];
  const matches = patterns.flatMap(pattern => Array.from(content.matchAll(pattern.regex)).map(match => ({ type: pattern.type, value: match[0] })));
  const uniqueTypes = Array.from(new Set(matches.map(item => item.type)));
  const severity = uniqueTypes.includes("medical data") && uniqueTypes.includes("GPS coordinates") ? "critical" : uniqueTypes.length >= 3 ? "high" : uniqueTypes.length ? "medium" : "low";
  return { piiTypes: uniqueTypes, evidence: matches.slice(0, 12).map(item => `${item.type}: ${item.value}`), severity: severity as "low" | "medium" | "high" | "critical" };
}

async function classifyWithLLM(content: string): Promise<{ piiTypes: string[]; evidence: string[]; severity: "low" | "medium" | "high" | "critical"; summary: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are Nuvira, a humanitarian data protection classifier. Return only the requested JSON. Detect names, case numbers, GPS coordinates, and medical data. Never invent evidence." },
        { role: "user", content: `Classify this synthetic humanitarian content:\n\n${content.slice(0, 10000)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "pii_classification", strict: true, schema: { type: "object", properties: { piiTypes: { type: "array", items: { type: "string" } }, evidence: { type: "array", items: { type: "string" } }, severity: { type: "string", enum: ["low", "medium", "high", "critical"] }, summary: { type: "string" } }, required: ["piiTypes", "evidence", "severity", "summary"], additionalProperties: false } } },
    });
    const raw = response.choices?.[0]?.message?.content;
    if (typeof raw === "string") return JSON.parse(raw) as { piiTypes: string[]; evidence: string[]; severity: "low" | "medium" | "high" | "critical"; summary: string };
  } catch (error) { console.warn("[Nuvira] LLM classification fallback:", error); }
  const local = classifyHeuristically(content);
  return { ...local, summary: local.piiTypes.length ? `Detected ${local.piiTypes.join(", ")} in the submitted asset.` : "No configured PII categories detected." };
}

function matchingPolicyIds(policies: any[], piiTypes: string[], source: string): number[] {
  const query = `${piiTypes.join(" ")} ${source} personal sensitive access confidentiality protection security`.toLowerCase();
  const ranked = policies.map(policy => {
    const words = `${policy.framework} ${policy.title} ${policy.keywords} ${policy.excerpt}`.toLowerCase().split(/[^a-z]+/);
    const score = words.filter((word: string) => word.length > 4 && query.includes(word)).length;
    return { id: policy.id, score };
  }).sort((a, b) => b.score - a.score);
  return ranked.slice(0, 4).map(item => item.id);
}

async function retrievePolicyIds(policies: any[], piiTypes: string[], source: string, summary: string): Promise<number[]> {
  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: "You are a humanitarian policy retrieval engine. Rank the supplied policy records for the detected exposure. Return only policy IDs, selecting up to four records. Prefer direct relevance to confidentiality, sensitive personal data, humanitarian protection, access control, and do-no-harm." }, { role: "user", content: JSON.stringify({ source, piiTypes, summary, policies: policies.map(policy => ({ id: policy.id, framework: policy.framework, citation: policy.citation, excerpt: policy.excerpt, keywords: policy.keywords })) }) }],
      response_format: { type: "json_schema", json_schema: { name: "policy_retrieval", strict: true, schema: { type: "object", properties: { policyIds: { type: "array", items: { type: "integer" }, maxItems: 4 } }, required: ["policyIds"], additionalProperties: false } } },
    });
    const raw = response.choices?.[0]?.message?.content;
    if (typeof raw === "string") {
      const ids = (JSON.parse(raw) as { policyIds: number[] }).policyIds.filter(id => policies.some(policy => policy.id === id));
      if (ids.length) return ids;
    }
  } catch (error) { console.warn("[Nuvira] Semantic policy retrieval fallback:", error); }
  return matchingPolicyIds(policies, piiTypes, source);
}

async function performScan(input: { name: string; source: Source; content: string }) {
  await ensurePolicies();
  const classification = await classifyWithLLM(input.content);
  const policies = await listPolicies();
  const contentHash = sha256(input.content);
  const prior = await findPriorRemediated(contentHash);
  const recurrence = prior ? prior.recurrence + 1 : 0;
  const severity = escalateSeverity(classification.severity, Boolean(prior));
  const summary = prior ? `${classification.summary} This asset matches a previously remediated exposure; severity escalated and prior action is linked.` : classification.summary;
  const policyIds = await retrievePolicyIds(policies, classification.piiTypes, input.source, summary);
  const result = await saveScan({ name: input.name, source: input.source, content: input.content, contentHash, severity, piiTypes: classification.piiTypes, evidence: classification.evidence, summary, priorFindingId: prior?.id, recurrence, policyIds });
  await appendEvent({ eventType: "policy.matches.retrieved", assetId: result.assetId, findingId: result.findingId, payload: { frameworks: policies.map((policy: { framework: string }) => policy.framework), piiTypes: classification.piiTypes } });
  return { ...result, classification, recurrence, escalated: Boolean(prior) };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  nuvira: router({
    dashboard: publicProcedure.query(async () => getDashboardData()),
    policies: publicProcedure.query(async () => listPolicies()),
    scan: publicProcedure.input(z.object({ name: z.string().min(1), source: sourceSchema, content: z.string().min(10) })).mutation(async ({ input }) => performScan(input)),
    seedDemo: publicProcedure.mutation(async () => {
      const demos: Array<{ name: string; source: Source; content: string }> = [
        { name: "displaced persons registry", source: "OneDrive", content: "Displaced persons registry\nAmina Yusuf, CASE-1042, medical diagnosis: diabetes, last seen near 34.781, 32.421. Share with field team." },
        { name: "Slack channel messages", source: "Slack", content: "#protection-ops\nJonas Reed: CASE-1042 is pregnant and staying at 34.781, 32.421. Please send the list to the partner." },
        { name: "donor report email", source: "Outlook", content: "Subject: donor report\nTo: donor@example.org\nThe beneficiary Maria Santos (CASE-2099) has malaria treatment and is located at 35.112, 33.874." },
      ];
      const results = [];
      for (const demo of demos) results.push(await performScan(demo));
      return results;
    }),
    approve: publicProcedure.input(z.object({ findingId: z.number(), action: actionSchema, note: z.string().optional() })).mutation(async ({ input, ctx }) => { await approveFinding(input.findingId, input.action, ctx.user?.id, input.note); return { success: true }; }),
    remediate: publicProcedure.input(z.object({ findingId: z.number(), action: actionSchema })).mutation(async ({ input }) => remediateFinding(input.findingId, input.action)),
  }),
});

export type AppRouter = typeof appRouter;
