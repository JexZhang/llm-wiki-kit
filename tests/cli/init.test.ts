import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execa } from "execa";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = path.resolve(__dirname, "../../packages/cli/src/index.ts");

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "lwk-init-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function runInit(args: string[] = []) {
  return execa(
    "pnpm",
    ["tsx", CLI_ENTRY, "init", "--yes", "--path", workDir, "--name", "Test Wiki", ...args],
    { reject: false, env: { ...process.env, NO_COLOR: "1" } }
  );
}

describe("init command", () => {
  it("creates wiki skeleton directories", async () => {
    const { exitCode } = await runInit();
    expect(exitCode).toBe(0);

    for (const d of ["raw", "wiki/domains", "wiki/entities", "wiki/concepts", "wiki/playbooks", "wiki/summaries"]) {
      const s = await stat(path.join(workDir, d));
      expect(s.isDirectory()).toBe(true);
    }
  });

  it("writes skeleton files with substituted wiki name", async () => {
    await runInit();
    const indexBody = await readFile(path.join(workDir, "index.md"), "utf8");
    expect(indexBody).toContain("Test Wiki — Index");
    expect(indexBody).not.toContain("{{WIKI_NAME}}");
  });

  it("generates all three agent instruction files", async () => {
    await runInit();
    for (const f of ["CLAUDE.md", "AGENTS.md", "COPILOT.md"]) {
      const body = await readFile(path.join(workDir, f), "utf8");
      expect(body).toContain("Test Wiki — LLM Wiki Schema");
    }
  });

  it("copies 4 skill packages to .llm-wiki-kit/skills/", async () => {
    await runInit();
    const skillsRoot = path.join(workDir, ".llm-wiki-kit/skills");
    for (const s of ["schema-wizard", "ingest", "query", "lint"]) {
      const skillMd = await stat(path.join(skillsRoot, s, "SKILL.md")).catch(() => null);
      expect(skillMd, `missing skill: ${s}`).not.toBeNull();
    }
  });
});
