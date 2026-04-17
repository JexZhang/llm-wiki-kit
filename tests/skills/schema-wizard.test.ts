import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "../../skills/schema-wizard/scripts/validate-schema.sh");
const FIX = path.resolve(__dirname, "../fixtures/schema");

async function runScript(file: string) {
  return execa("bash", [SCRIPT, file], { reject: false });
}

describe("validate-schema.sh", () => {
  it("returns status=pass for valid schema", async () => {
    const { stdout, exitCode } = await runScript(path.join(FIX, "valid.md"));
    expect(exitCode).toBe(0);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("pass");
    expect(out.errors).toEqual([]);
  });

  it("returns status=fail and lists missing sections", async () => {
    const { stdout, exitCode } = await runScript(path.join(FIX, "missing-sections.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    const rules = out.errors.map((e: { rule: string }) => e.rule);
    expect(rules).toContain("missing-section");
  });

  it("fails when file does not exist", async () => {
    const { stdout, exitCode } = await runScript(path.join(FIX, "nope.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    expect(out.errors[0].rule).toBe("file-not-found");
  });
});
