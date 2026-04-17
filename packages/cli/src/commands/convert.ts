import path from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { ensureDir } from "../lib/fs-utils.js";
import { convertOne, detectPandoc } from "../lib/pandoc.js";
import { postProcess } from "../lib/post-process.js";

export interface ConvertOptions {
  input: string;
  output: string;
}

const SUPPORTED = new Set([".docx", ".html", ".htm", ".epub", ".pptx"]);

export async function runConvert(opts: ConvertOptions): Promise<void> {
  const status = await detectPandoc();
  if (!status.installed) {
    console.error(status.hint);
    process.exit(1);
  }

  await ensureDir(opts.output);
  const entries = await readdir(opts.input, { withFileTypes: true });

  let converted = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const srcPath = path.join(opts.input, entry.name);

    if (ext === ".pdf") {
      console.log(`[skip] ${entry.name} — PDF 转换将在 v2 支持`);
      skipped++;
      continue;
    }

    if (!SUPPORTED.has(ext)) {
      console.log(`[skip] ${entry.name} — 不支持的格式 ${ext}`);
      skipped++;
      continue;
    }

    const base = path.basename(entry.name, ext);
    const dstPath = path.join(opts.output, `${base}.md`);
    await convertOne(srcPath, dstPath);
    const raw = await readFile(dstPath, "utf8");
    await writeFile(dstPath, postProcess(raw), "utf8");
    console.log(`[ok]   ${entry.name} → ${path.basename(dstPath)}`);
    converted++;
  }

  console.log(`\n共转换 ${converted} 个文件，跳过 ${skipped} 个。`);
}
