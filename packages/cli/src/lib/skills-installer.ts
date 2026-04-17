import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDir, pathExists } from "./fs-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 运行时 skills 位置：
// - 本地开发：../../../../skills（monorepo 根下的 skills/）
// - 发布后：../skills（打包到 npm 包内）
async function resolveSkillsSource(): Promise<string> {
  const candidates = [
    path.resolve(__dirname, "../../../../skills"),
    path.resolve(__dirname, "../../skills"),
    path.resolve(__dirname, "../skills")
  ];
  for (const c of candidates) {
    if (await pathExists(c)) return c;
  }
  throw new Error(
    `无法定位 skills/ 目录，已尝试：\n${candidates.join("\n")}`
  );
}

export async function installSkills(
  wikiRoot: string,
  relativeSkillsDir: string
): Promise<{ installed: string[]; destination: string }> {
  const src = await resolveSkillsSource();
  const dst = path.join(wikiRoot, relativeSkillsDir);
  await copyDir(src, dst);
  return {
    installed: ["schema-wizard", "ingest", "query", "lint"],
    destination: dst
  };
}
