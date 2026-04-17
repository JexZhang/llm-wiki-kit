import { mkdir, writeFile, cp, stat } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeFileEnsured(
  filePath: string,
  contents: string
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, contents, "utf8");
}

export async function copyDir(src: string, dst: string): Promise<void> {
  await ensureDir(dst);
  await cp(src, dst, { recursive: true });
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
