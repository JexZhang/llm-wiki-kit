import * as p from "@clack/prompts";
import path from "node:path";

export interface InitAnswers {
  name: string;
  targetDir: string;
  skillsDir: string;
  generateAgentFiles: boolean;
}

export interface PromptDefaults {
  name?: string;
  targetDir?: string;
}

export async function promptInit(
  defaults: PromptDefaults = {}
): Promise<InitAnswers> {
  p.intro("llm-wiki-kit init");

  const name = await p.text({
    message: "知识库名称？",
    defaultValue: defaults.name ?? "My Wiki",
    placeholder: "My Wiki"
  });
  if (p.isCancel(name)) {
    p.cancel("已取消");
    process.exit(0);
  }

  const targetDir = await p.text({
    message: "存放路径？",
    defaultValue: defaults.targetDir ?? path.resolve("./my-wiki"),
    placeholder: path.resolve("./my-wiki")
  });
  if (p.isCancel(targetDir)) {
    p.cancel("已取消");
    process.exit(0);
  }

  const skillsChoice = await p.select({
    message: "Skills 安装到哪里？",
    options: [
      { value: ".llm-wiki-kit/skills", label: "项目内 .llm-wiki-kit/skills/（推荐）" },
      { value: ".claude/skills", label: ".claude/skills/" },
      { value: "custom", label: "自定义路径" }
    ],
    initialValue: ".llm-wiki-kit/skills"
  });
  if (p.isCancel(skillsChoice)) {
    p.cancel("已取消");
    process.exit(0);
  }

  let skillsDir: string;
  if (skillsChoice === "custom") {
    const custom = await p.text({
      message: "自定义 skills 路径（相对 wiki 根）？",
      defaultValue: "skills"
    });
    if (p.isCancel(custom)) {
      p.cancel("已取消");
      process.exit(0);
    }
    skillsDir = custom;
  } else {
    skillsDir = skillsChoice;
  }

  const generateAgentFiles = await p.confirm({
    message: "同时生成 CLAUDE.md / AGENTS.md / COPILOT.md？",
    initialValue: true
  });
  if (p.isCancel(generateAgentFiles)) {
    p.cancel("已取消");
    process.exit(0);
  }

  p.outro("确认完成，开始生成 ...");

  return { name, targetDir, skillsDir, generateAgentFiles };
}

export function defaultsFor(
  opts: { name?: string; path?: string }
): InitAnswers {
  const targetDir = path.resolve(opts.path ?? "./my-wiki");
  return {
    name: opts.name ?? "My Wiki",
    targetDir,
    skillsDir: ".llm-wiki-kit/skills",
    generateAgentFiles: true
  };
}
