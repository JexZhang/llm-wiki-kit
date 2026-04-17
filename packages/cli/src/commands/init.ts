import path from "node:path";
import * as p from "@clack/prompts";
import { ensureDir, writeFileEnsured } from "../lib/fs-utils.js";
import { loadTemplate } from "../lib/templates.js";
import { defaultsFor, promptInit } from "../lib/prompts.js";
import { installSkills } from "../lib/skills-installer.js";

export interface InitOptions {
  yes?: boolean;
  path?: string;
  name?: string;
}

const WIKI_SUBDIRS = [
  "raw",
  "wiki/domains",
  "wiki/entities",
  "wiki/concepts",
  "wiki/playbooks",
  "wiki/summaries"
];

export async function runInit(opts: InitOptions): Promise<void> {
  const answers = opts.yes
    ? defaultsFor({ name: opts.name, path: opts.path })
    : await promptInit({ name: opts.name, targetDir: opts.path });

  for (const d of WIKI_SUBDIRS) {
    await ensureDir(path.join(answers.targetDir, d));
  }

  const vars = {
    WIKI_NAME: answers.name,
    SKILLS_DIR: answers.skillsDir
  };

  const indexBody = await loadTemplate("index.md", vars);
  await writeFileEnsured(path.join(answers.targetDir, "index.md"), indexBody);

  const logBody = await loadTemplate("log.md", vars);
  await writeFileEnsured(path.join(answers.targetDir, "log.md"), logBody);

  const mocBody = await loadTemplate("MOC.md", vars);
  await writeFileEnsured(path.join(answers.targetDir, "MOC.md"), mocBody);

  const readmeBody = await loadTemplate("wiki-readme.md", vars);
  await writeFileEnsured(path.join(answers.targetDir, "README.md"), readmeBody);

  if (answers.generateAgentFiles) {
    const agentBody = await loadTemplate("agent-instructions.md", vars);
    for (const f of ["CLAUDE.md", "AGENTS.md", "COPILOT.md"]) {
      await writeFileEnsured(path.join(answers.targetDir, f), agentBody);
    }
  }

  const { installed, destination } = await installSkills(
    answers.targetDir,
    answers.skillsDir
  );

  if (!opts.yes) {
    p.note(
      `已创建 wiki：${answers.targetDir}\n已安装 skills (${installed.length}) 到 ${destination}`,
      "完成"
    );
  }
}
