import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../../templates");

export function renderTemplate(
  source: string,
  vars: Record<string, string>
): string {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) =>
    key in vars ? vars[key]! : match
  );
}

export async function loadTemplate(
  name: string,
  vars: Record<string, string>
): Promise<string> {
  const raw = await readFile(path.join(TEMPLATES_DIR, name), "utf8");
  return renderTemplate(raw, vars);
}
