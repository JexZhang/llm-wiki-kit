import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { InitOptions } from "./commands/init.js";
import type { ConvertOptions } from "./commands/convert.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "../package.json"), "utf8")
) as { version: string };

const program = new Command();

program
  .name("llm-wiki-kit")
  .description("Scaffold and maintain an LLM Wiki")
  .version(pkg.version);

program
  .command("init")
  .description("Interactively scaffold a new LLM Wiki")
  .option("-y, --yes", "skip interactive prompts and use defaults")
  .option("--path <dir>", "target directory")
  .option("--name <name>", "wiki name")
  .action(async (opts: InitOptions) => {
    const { runInit } = await import("./commands/init.js");
    await runInit(opts);
  });

program
  .command("convert")
  .description("Batch-convert documents to Obsidian Markdown via pandoc")
  .requiredOption("-i, --input <dir>", "source directory")
  .requiredOption("-o, --output <dir>", "output directory")
  .action(async (opts: ConvertOptions) => {
    const { runConvert } = await import("./commands/convert.js");
    await runConvert(opts);
  });

program.parseAsync(process.argv);
