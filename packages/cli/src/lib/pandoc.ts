import { execa } from "execa";

export interface PandocStatus {
  installed: boolean;
  version?: string;
  hint?: string;
}

export async function detectPandoc(): Promise<PandocStatus> {
  try {
    const { stdout } = await execa("pandoc", ["--version"]);
    const firstLine = stdout.split("\n")[0] ?? "";
    const match = firstLine.match(/pandoc\s+(\S+)/i);
    return {
      installed: true,
      version: match?.[1] ?? "unknown"
    };
  } catch {
    return {
      installed: false,
      hint:
        "Pandoc 未安装。macOS: `brew install pandoc`；" +
        "Linux: `apt-get install pandoc`；" +
        "Windows: 见 https://pandoc.org/installing.html"
    };
  }
}

export async function convertOne(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const ext = inputPath.split('.').pop()?.toLowerCase();
  const fromFormat: Record<string, string> = {
    docx: 'docx',
    html: 'html',
    htm: 'html',
    epub: 'epub',
    pptx: 'docx' // pptx 当作 docx 处理
  };
  const format = fromFormat[ext || ''] || 'docx';
  
  await execa("pandoc", [
    inputPath,
    "-o", outputPath,
    `-f${format}`,
    "--to=gfm+wikilinks_title_after_pipe",
    "--wrap=none"
  ]);
}
