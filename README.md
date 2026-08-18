# Nuvira

Humanitarian data protection intelligence. Nuvira scans OneDrive, Slack, and Outlook content for names, case numbers, GPS, and medical data, cites ICRC / GDPR / Sphere policy, and records a hash-chained audit trail.

## Features

- Scan pasted or uploaded OneDrive, Slack, or Outlook content
- Detect names, case numbers, GPS coordinates, and medical data
- Built-in ICRC, GDPR, and Sphere Standards policy corpus
- Human approval before every redact or access-revocation
- Hash-chained, tamper-evident audit log
- Recurrence detection for previously remediated assets
- Demo mode with three synthetic humanitarian datasets
- Control room: Scan, Findings, Approvals, Audit

## Prerequisites

- Node.js
- [pnpm](https://pnpm.io) 10 (see `packageManager` in `package.json`)
- A CockroachDB connection string in `DATABASE_URL` (PostgreSQL URL). Without it, the app still runs against an in-memory store.

## Getting started

```bash
git clone https://github.com/fozagtx/nuvira-humanitarian-data-protection.git
cd nuvira-humanitarian-data-protection
pnpm install
```

Put the CockroachDB URL in a gitignored `.dev` file:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:26257/defaultdb?sslmode=verify-full
```

Start the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000/) locally, or the live app at [https://nuvira-blush.vercel.app](https://nuvira-blush.vercel.app).

On Scan, use **Load** or **Download** on the sample files (`client/public/samples/`):

- `displaced-persons-registry.csv` — OneDrive-style caseload
- `slack-protection-ops.txt` — Slack `#protection-ops` thread
- `donor-report-email.txt` — Outlook donor email

They are synthetic. Then **Classify exposure**, or click **Run demo mode**.

## Usage

1. Open the control room (no sign-in).
2. Paste or upload content, or choose **Run demo mode**.
3. Review findings (severity, PII types, source, status, policy citations).
4. Approve `redact` or `revoke_access`, then remediate. Destructive actions are blocked until approved.
5. Inspect Audit for hash-chained events.

## Scripts

```bash
pnpm dev       # development server
pnpm build     # Vite client + esbuild server → dist/
pnpm start     # production server (NODE_ENV=production)
pnpm check     # tsc --noEmit
pnpm format    # prettier --write .
pnpm test      # vitest run
pnpm db:push   # drizzle-kit generate && drizzle-kit migrate
```

## Configuration

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | CockroachDB `postgresql://` URL. Loaded from `.dev` or `.env`. |
| `PORT` | Preferred HTTP port. Defaults to `3000`. |

## Publishing

Prepare a checkpoint and publish through the project UI. Do not deploy this app to Vercel.

## Troubleshooting

- `DATABASE_URL is required to run drizzle commands` — set `DATABASE_URL` in `.dev` before `pnpm db:push`.
- `[Database] Failed to connect` — check the Cockroach URL, SSL (`sslmode=verify-full`), and that the cluster CA is at `~/.postgresql/root.crt`.
- No persistence after restart — `DATABASE_URL` was missing, so the in-memory store was used.
