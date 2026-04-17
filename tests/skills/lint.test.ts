import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execa } from "execa";
import { mkdtemp, rm, cp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(__dirname, "../../skills/lint/scripts");
const WIKI_OK = path.resolve(__dirname, "../fixtures/wiki");
const WIKI_BAD = path.resolve(__dirname, "../fixtures/wiki-bad");

async function run(script: string, arg: string) {
  return execa("bash", [path.join(SCRIPTS, script), arg], { reject: false });
}

describe("check-frontmatter.sh", () => {
  it("passes on clean wiki", async () => {
    const { stdout, exitCode } = await run("check-frontmatter.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("fails with same kinds of errors as ingest's validator", async () => {
    const { stdout, exitCode } = await run("check-frontmatter.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const rules = new Set(
      JSON.parse(stdout).errors.map((e: { rule: string }) => e.rule)
    );
    expect(rules.has("missing-required-field") || rules.has("type-dir-mismatch")).toBe(true);
  });
});

describe("check-index-drift.sh", () => {
  it("passes on synced index", async () => {
    const { stdout, exitCode } = await run("check-index-drift.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports drift", async () => {
    const { stdout, exitCode } = await run("check-index-drift.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const rules = new Set(
      JSON.parse(stdout).errors.map((e: { rule: string }) => e.rule)
    );
    expect(rules.has("index-missing-page") || rules.has("index-orphan-entry")).toBe(true);
  });
});

describe("check-orphans.sh", () => {
  it("passes when every page has inbound link", async () => {
    const { stdout, exitCode } = await run("check-orphans.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports orphans", async () => {
    const { stdout, exitCode } = await run("check-orphans.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const messages = JSON.parse(stdout).errors.map((e: { message: string }) => e.message);
    expect(messages.some((m: string) => m.includes("孤儿概念"))).toBe(true);
  });
});

describe("generate-health-base.sh", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "lwk-lint-"));
    await cp(WIKI_OK, workDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("creates wiki/health.base with expected fields", async () => {
    const { exitCode } = await run("generate-health-base.sh", workDir);
    expect(exitCode).toBe(0);
    const body = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
    expect(body).toMatch(/^filters:/m);
    expect(body).toMatch(/total_pages:/);
    expect(body).toMatch(/orphans_count:/);
    expect(body).toMatch(/frontmatter_errors_count:/);
    expect(body).toMatch(/index_drift_count:/);
  });

  it("is idempotent when LWK_NOW is fixed", async () => {
    const env = { ...process.env, LWK_NOW: "2026-04-20 10:00" };
    await execa("bash", [path.join(SCRIPTS, "generate-health-base.sh"), workDir], {
      env, reject: false
    });
    const a = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
    await execa("bash", [path.join(SCRIPTS, "generate-health-base.sh"), workDir], {
      env, reject: false
    });
    const b = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
    expect(b).toBe(a);
  });
});
