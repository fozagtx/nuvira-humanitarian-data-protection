import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
config({ path: resolve(root, ".env"), quiet: true });
config({ path: resolve(root, ".dev"), override: true, quiet: true });

function unquote(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function applyDevFileUrls() {
  if (!process.env.DATABASE_URL && process.env.COCKROACH_URL) {
    process.env.DATABASE_URL = process.env.COCKROACH_URL;
  }
  if (process.env.DATABASE_URL) return;

  const devPath = resolve(root, ".dev");
  if (!existsSync(devPath)) return;

  for (const raw of readFileSync(devPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;

    const keyed = line.match(/^(?:DATABASE_URL|COCKROACH_URL)\s*=\s*(.+)$/);
    if (keyed) {
      process.env.DATABASE_URL = unquote(keyed[1]);
      return;
    }

    const embedded = line.match(/postgres(?:ql)?:\/\/\S+/);
    if (embedded) {
      process.env.DATABASE_URL = unquote(embedded[0].replace(/['"]+$/, ""));
      return;
    }
  }
}

applyDevFileUrls();
