import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowUpRight, Check, Database, FileSearch, Fingerprint, LockKeyhole, RefreshCw, ShieldCheck, Upload, Zap } from "lucide-react";

const demoCopy = {
  "displaced persons registry": "Displaced persons registry\nAmina Yusuf, CASE-1042, medical diagnosis: diabetes, last seen near 34.781, 32.421. Share with field team.",
  "Slack channel messages": "#protection-ops\nJonas Reed: CASE-1042 is pregnant and staying at 34.781, 32.421. Please send the list to the partner.",
  "donor report email": "Subject: donor report\nTo: donor@example.org\nThe beneficiary Maria Santos (CASE-2099) has malaria treatment and is located at 35.112, 33.874.",
};

function parseJson(value: string | null | undefined): string[] {
  try { return value ? JSON.parse(value) : []; } catch { return value ? [value] : []; }
}
function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}
function severityClass(severity: string) {
  if (severity === "critical") return "border-destructive/40 bg-destructive/15 text-destructive";
  if (severity === "high") return "border-brand/40 bg-brand/15 text-brand-light";
  if (severity === "medium") return "border-border bg-muted text-muted-foreground";
  return "border-border bg-muted/60 text-muted-foreground";
}

export default function Home() {
  const [location] = useLocation();
  const view = location === "/findings" ? "findings" : location === "/approvals" ? "approvals" : location === "/audit" ? "audit" : "history";
  const dashboard = trpc.nuvira.dashboard.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  const scanMutation = trpc.nuvira.scan.useMutation({ onSuccess: () => { dashboard.refetch(); toast.success("Scan complete", { description: "Nuvira stored the finding and linked relevant policy memory." }); }, onError: error => toast.error(error.message) });
  const demoMutation = trpc.nuvira.seedDemo.useMutation({ onSuccess: result => { dashboard.refetch(); toast.success(`${result.length} demo assets scanned`); }, onError: error => toast.error(error.message) });
  const approveMutation = trpc.nuvira.approve.useMutation({ onSuccess: () => { dashboard.refetch(); toast.success("Approval recorded"); }, onError: error => toast.error(error.message) });
  const remediateMutation = trpc.nuvira.remediate.useMutation({ onSuccess: () => { dashboard.refetch(); toast.success("Remediation completed and hashed in the audit trail"); }, onError: error => toast.error(error.message) });
  const [name, setName] = useState("new protection asset");
  const [source, setSource] = useState<"OneDrive" | "Slack" | "Outlook">("OneDrive");
  const [content, setContent] = useState("");
  const [filter, setFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const data = dashboard.data;
  const findings = useMemo(() => (data?.findings ?? []).filter(finding => filter === "all" || finding.status === filter || finding.severity === filter), [data, filter]);
  const stats = { assets: data?.assets.length ?? 0, open: data?.findings.filter(f => f.status === "open").length ?? 0, critical: data?.findings.filter(f => f.severity === "critical").length ?? 0, events: data?.events.length ?? 0 };
  const metricCards: Array<[string, number, string, React.ComponentType<{ className?: string }>]> = [["Data assets", stats.assets, "persistent memory", Database], ["Open findings", stats.open, "awaiting approval", AlertTriangle], ["Critical exposures", stats.critical, "escalated by risk", ShieldCheck], ["Audit events", stats.events, "hash-chained records", Fingerprint]];

  const runScan = () => { if (!content.trim()) { toast.error("Paste or upload content first"); return; } scanMutation.mutate({ name, source, content }); };
  const uploadFile = (file?: File) => { if (!file) return; setName(file.name); const reader = new FileReader(); reader.onload = event => setContent(String(event.target?.result ?? "")); reader.readAsText(file); };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100dvh-56px)] bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 flex items-center gap-2 font-mono text-sm tracking-[0.5px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                Protection intelligence active
              </p>
              <h1 className="max-w-3xl text-4xl font-normal tracking-[-0.5px] text-balance sm:text-5xl md:text-6xl">
                Nuvira control room
              </h1>
              <p className="mt-4 max-w-[500px] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                Humanitarian data protection that remembers every exposure, policy decision, approval, and remediation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => dashboard.refetch()} aria-label="Refresh dashboard">
                <RefreshCw className="h-4 w-4" />Refresh
              </Button>
              <Button onClick={() => demoMutation.mutate()} disabled={demoMutation.isPending}>
                <Zap className="h-4 w-4" />{demoMutation.isPending ? "Running…" : "Run demo mode"}
              </Button>
            </div>
          </header>

          {dashboard.isError && (
            <div className="rounded-[10px] border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Could not load dashboard data. <button type="button" className="underline" onClick={() => dashboard.refetch()}>Retry</button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(([label, value, note, Icon]) => (
              <Card key={label} className="border-border bg-card shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm tracking-[0.5px] text-muted-foreground">{label}</p>
                      <p className="mt-2 font-mono text-3xl tabular-nums tracking-[-0.5px]">{dashboard.data == null ? "—" : value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-3 text-brand-light">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {view === "history" && (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-border bg-card shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm tracking-[0.5px] text-muted-foreground">Ingest</p>
                      <CardTitle className="mt-1 text-2xl font-medium tracking-[-0.5px]">Scan a data asset</CardTitle>
                      <p className="mt-2 max-w-[500px] text-sm leading-relaxed text-muted-foreground">Paste content or upload a synthetic export.</p>
                    </div>
                    <FileSearch className="h-5 w-5 text-brand-light" aria-hidden />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                    <div className="space-y-1.5">
                      <label htmlFor="asset-name" className="font-mono text-xs tracking-[0.5px] text-muted-foreground">Asset name</label>
                      <Input id="asset-name" value={name} onChange={e => setName(e.target.value)} placeholder="Asset name" className="h-10 border-input bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="asset-source" className="font-mono text-xs tracking-[0.5px] text-muted-foreground">Source</label>
                      <select id="asset-source" value={source} onChange={e => setSource(e.target.value as typeof source)} className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm">
                        <option>OneDrive</option>
                        <option>Slack</option>
                        <option>Outlook</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="asset-content" className="font-mono text-xs tracking-[0.5px] text-muted-foreground">Content</label>
                    <Textarea id="asset-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Paste a synthetic registry, Slack export, or donor email…" className="min-h-[190px] resize-none border-input bg-background" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept=".txt,.csv,.md,.json" className="hidden" onChange={e => uploadFile(e.target.files?.[0])} />
                    <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Upload text</Button>
                    <Button onClick={runScan} disabled={scanMutation.isPending}>
                      {scanMutation.isPending ? "Classifying…" : "Classify exposure"}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="mb-2 font-mono text-xs tracking-[0.5px] text-muted-foreground">Load demo content</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(demoCopy).map(([label, text]) => (
                        <Button key={label} size="sm" variant="ghost" onClick={() => { setName(label); setContent(text); setSource(label === "displaced persons registry" ? "OneDrive" : label === "Slack channel messages" ? "Slack" : "Outlook"); }}>
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-medium tracking-[-0.5px]">
                    <LockKeyhole className="h-5 w-5 text-brand-light" aria-hidden />Protection posture
                  </CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground">Built-in policy memory and non-bypassable action controls.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[["ICRC", "confidentiality"], ["GDPR", "minimisation"], ["Sphere Standards", "do no harm"]].map(([framework, detail]) => (
                      <div key={framework} className="rounded-[10px] border border-border bg-muted/40 p-4">
                        <p className="font-medium tracking-[-0.5px]">{framework}</p>
                        <p className="mt-1 font-mono text-xs tracking-[0.5px] text-muted-foreground">{detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 text-sm">
                    {[["Persistent memory", "Connected"], ["Human approval gate", "Required"], ["Tamper-evident ledger", "Hash chained"]].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <Badge variant="outline" className="border-brand/40 bg-brand/10 font-mono text-brand-light">{value}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[10px] border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
                    Nuvira never redacts or revokes access from an unapproved finding. Every action requires an explicit approval record.
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {view === "findings" && <FindingsView findings={findings} filter={filter} setFilter={setFilter} policyMap={data?.policyMap ?? {}} onApprove={(id: number, action: "redact" | "revoke_access") => approveMutation.mutate({ findingId: id, action })} onRemediate={(id: number, action: "redact" | "revoke_access") => remediateMutation.mutate({ findingId: id, action })} />}
          {view === "approvals" && <ApprovalsView findings={data?.findings ?? []} approvals={data?.approvals ?? []} onApprove={(id: number, action: "redact" | "revoke_access") => approveMutation.mutate({ findingId: id, action })} onRemediate={(id: number, action: "redact" | "revoke_access") => remediateMutation.mutate({ findingId: id, action })} />}
          {view === "audit" && <AuditView events={data?.events ?? []} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function FindingsView({ findings, filter, setFilter, policyMap, onApprove, onRemediate }: any) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-sm tracking-[0.5px] text-muted-foreground">Review</p>
          <CardTitle className="mt-1 text-2xl font-medium tracking-[-0.5px]">Detected exposures</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">Review persistent findings before any action is taken.</p>
        </div>
        <label className="sr-only" htmlFor="finding-filter">Filter findings</label>
        <select id="finding-filter" value={filter} onChange={e => setFilter(e.target.value)} className="h-10 rounded-2xl border border-input bg-background px-3 text-sm">
          <option value="all">All findings</option>
          <option value="open">open</option>
          <option value="approved">approved</option>
          <option value="remediated">remediated</option>
          <option value="critical">critical</option>
          <option value="high">high</option>
        </select>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {findings.length === 0 ? <EmptyState text="No findings match this filter. Run demo mode or scan an asset." /> : findings.map((finding: any) => (
            <div key={finding.id} className="rounded-[10px] border border-border p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={severityClass(finding.severity)}>{finding.severity}</Badge>
                    <Badge variant="outline">{finding.status}</Badge>
                    {finding.recurrence > 0 && <Badge className="border-brand/40 bg-brand/15 text-brand-light">recurrence ×{finding.recurrence}</Badge>}
                  </div>
                  <h3 className="mt-3 text-lg font-medium tracking-[-0.5px]">{finding.summary}</h3>
                  <p className="mt-1 font-mono text-xs tracking-[0.5px] text-muted-foreground">Source: {finding.source} · {finding.assetName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parseJson(finding.piiTypes).map(type => <span key={type} className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">{type}</span>)}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Evidence: {parseJson(finding.evidence).join(" · ") || "No direct evidence"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(policyMap[finding.id] ?? []).map((policy: any) => <span key={policy?.id} className="font-mono text-xs tracking-[0.5px] text-brand-light">{policy?.framework} · {policy?.citation}</span>)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 lg:w-48">
                  {finding.status === "open" && (
                    <>
                      <Button size="sm" onClick={() => onApprove(finding.id, "redact")}><Check className="h-4 w-4" />Approve redaction</Button>
                      <Button size="sm" variant="outline" onClick={() => onApprove(finding.id, "revoke_access")}>Approve access revoke</Button>
                    </>
                  )}
                  {finding.status === "approved" && (
                    <>
                      <Button size="sm" onClick={() => onRemediate(finding.id, "redact")}>Execute redaction</Button>
                      <Button size="sm" variant="outline" onClick={() => onRemediate(finding.id, "revoke_access")}>Revoke access</Button>
                    </>
                  )}
                  {finding.status === "remediated" && <div className="rounded-2xl border border-border bg-muted/40 p-3 text-center font-mono text-xs text-muted-foreground">Remediation recorded</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalsView({ findings, approvals, onApprove, onRemediate }: any) {
  const pending = findings.filter((finding: any) => finding.status === "open");
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card className="border-border bg-card shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-medium tracking-[-0.5px]">Approval queue</CardTitle>
          <p className="text-sm text-muted-foreground">Explicit consent is required before destructive actions.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? <EmptyState text="No findings are waiting for approval." /> : pending.map((finding: any) => (
            <div key={finding.id} className="rounded-[10px] border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium tracking-[-0.5px]">Finding #{finding.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{finding.summary}</p>
                </div>
                <Badge className="border-brand/40 bg-brand/15 text-brand-light">approval needed</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onApprove(finding.id, "redact")}>Approve redaction</Button>
                <Button size="sm" variant="outline" onClick={() => onApprove(finding.id, "revoke_access")}>Approve revoke</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-border bg-card shadow-none">
        <CardHeader><CardTitle className="text-2xl font-medium tracking-[-0.5px]">Decision history</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {approvals.length === 0 ? <EmptyState text="No approval records yet." /> : approvals.map((approval: any) => (
            <div key={approval.id} className="rounded-[10px] bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">Finding #{approval.findingId}</span>
                <Badge variant="outline">{approval.decision}</Badge>
              </div>
              <p className="mt-1 font-mono text-xs tracking-[0.5px] text-muted-foreground">{approval.action} · {formatDate(approval.createdAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditView({ events }: any) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-medium tracking-[-0.5px]">
          <Fingerprint className="h-5 w-5 text-brand-light" aria-hidden />Tamper-evident audit trail
        </CardTitle>
        <p className="text-sm text-muted-foreground">Each event carries the hash of the previous event.</p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? <EmptyState text="No audit events yet. Run demo mode or scan an asset." /> : (
          <div>
            {events.map((event: any, index: number) => (
              <div key={event.id} className="relative flex gap-4 pb-6">
                <div className="flex flex-col items-center">
                  <div className="mt-1 h-3 w-3 rounded-full border-2 border-brand bg-background" />
                  {index < events.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1 rounded-[10px] border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium tracking-[-0.5px]">{event.eventType}</span>
                    <span className="font-mono text-xs tracking-[0.5px] text-muted-foreground">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">event {event.eventHash}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">previous {event.previousHash}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
