import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execa } from "execa";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = path.resolve(__dirname, "../../packages/cli/src/index.ts");
const FIXTURE_DIR = path.resolve(__dirname, "../fixtures/docs");

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), "lwk-convert-"));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

async function runConvert() {
  return execa(
    "pnpm",
    ["tsx", CLI_ENTRY, "convert", "-i", FIXTURE_DIR, "-o", outDir],
    { reject: false, env: { ...process.env, NO_COLOR: "1" } }
  );
}

describe("convert command", () => {
  it("converts .docx to .md and preserves basename", async () => {
    const { exitCode } = await runConvert();
    expect(exitCode).toBe(0);

    const files = await readdir(outDir);
    expect(files).toContain("sample.md");
  });

  it("skips pdf files with a notice", async () => {
    const { stdout, exitCode } = await runConvert();
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/skip-me\.pdf/);
    expect(stdout).toMatch(/PDF/);
  });

  it("post-processes output (no media/ paths)", async () => {
    await runConvert();
    const body = await readFile(path.join(outDir, "sample.md"), "utf8");
    expect(body).not.toMatch(/media\//);
  });
});
