import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_SCRIPTS = path.resolve(__dirname, "../../skills/ingest/scripts");
const WIKI_OK = path.resolve(__dirname, "../fixtures/wiki");
const WIKI_BAD = path.resolve(__dirname, "../fixtures/wiki-bad");

async function run(script: string, arg: string) {
  return execa("bash", [path.join(SKILL_SCRIPTS, script), arg], { reject: false });
}

describe("validate-frontmatter.sh", () => {
  it("passes on compliant wiki", async () => {
    const { stdout, exitCode } = await run("validate-frontmatter.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports missing sources for summary page", async () => {
    const { stdout, exitCode } = await run("validate-frontmatter.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    const rules = out.errors.map((e: { rule: string }) => e.rule);
    expect(rules).toContain("missing-required-field");
    expect(rules).toContain("type-dir-mismatch");
  });
});
