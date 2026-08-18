import { describe, expect, it } from "vitest";
import { classifyHeuristically, escalateSeverity } from "./routers";
import { computeEventHash, requireApprovedAction, sha256 } from "./db";
import { readFileSync } from "node:fs";

describe("Nuvira core protection logic", () => {
  it("detects names, case numbers, GPS coordinates, and medical data", () => {
    const result = classifyHeuristically("Amina Yusuf CASE-1042 has diabetes near 34.781, 32.421");
    expect(result.piiTypes).toEqual(expect.arrayContaining(["names", "case numbers", "GPS coordinates", "medical data"]));
    expect(result.severity).toBe("critical");
    expect(result.evidence.length).toBeGreaterThanOrEqual(4);
  });

  it("returns low severity when no configured PII category is present", () => {
    const result = classifyHeuristically("The logistics team will meet at the warehouse tomorrow.");
    expect(result.piiTypes).toEqual([]);
    expect(result.severity).toBe("low");
  });

  it("escalates a recurring remediated exposure to critical", () => {
    expect(escalateSeverity("medium", true)).toBe("critical");
    expect(escalateSeverity("critical", true)).toBe("critical");
    expect(escalateSeverity("medium", false)).toBe("medium");
  });

  it("blocks destructive remediation without approval", () => {
    expect(() => requireApprovedAction(false)).toThrow("Approval required");
    expect(() => requireApprovedAction(true)).not.toThrow();
  });

  it("contains the configured Nuvira browser title", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(html).toContain("Nuvira — Humanitarian Data Protection Intelligence");
  });

  it("keeps a single Home instance across dashboard sections", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    expect(app).toContain('new Set(["/", "/findings", "/approvals", "/audit"])');
    expect(app).not.toContain("path=\"/findings\" component={Home}");
  });

  it("uses Nuvira as the product name and has no leftover Amanat branding", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(home).toContain("Nuvira");
    expect(home).toContain("Protection intelligence active");
    expect(home.toLowerCase()).not.toContain("amanat");
    expect(layout.toLowerCase()).not.toContain("amanat");
    expect(layout).toContain("Nuvira");
    expect(routers.toLowerCase()).not.toContain("amanat");
    expect(routers).toContain("nuvira:");
  });

  it("creates deterministic chained event hashes", () => {
    const first = computeEventHash("GENESIS", "scan.completed", 1, 2, "{}");
    const second = computeEventHash(first, "approval.granted", 1, 2, "{\"action\":\"redact\"}");
    expect(first).toHaveLength(64);
    expect(second).toHaveLength(64);
    expect(first).not.toBe(second);
    expect(sha256("same input")).toBe(sha256("same input"));
  });
});
