import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "../../skills/query/scripts/validate-backfill.sh");
const FIX = path.resolve(__dirname, "../fixtures/backfill");

async function run(file: string) {
  return execa("bash", [SCRIPT, file], { reject: false });
}

describe("validate-backfill.sh", () => {
  it("passes on good backfill page", async () => {
    const { stdout, exitCode } = await run(path.join(FIX, "good.md"));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("flags orphan (no outbound links)", async () => {
    const { stdout, exitCode } = await run(path.join(FIX, "orphan.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.errors.some((e: { rule: string }) => e.rule === "no-links")).toBe(true);
  });

  it("flags missing required field", async () => {
    const { stdout, exitCode } = await run(path.join(FIX, "missing-field.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.errors.some((e: { rule: string }) => e.rule === "missing-required-field")).toBe(true);
  });
});
