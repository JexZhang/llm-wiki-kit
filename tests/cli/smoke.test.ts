import { execa } from "execa";
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = path.resolve(__dirname, "../../packages/cli/src/index.ts");

async function runCli(args: string[]) {
  return execa("pnpm", ["tsx", CLI_ENTRY, ...args], {
    reject: false,
    env: { ...process.env, NO_COLOR: "1" }
  });
}

describe("llm-wiki-kit CLI smoke", () => {
  it("prints version with --version", async () => {
    const { stdout, exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("lists init and convert in --help", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("init");
    expect(stdout).toContain("convert");
  });
});
