# llm-wiki-kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 `llm-wiki-kit` 开源工具包——TypeScript CLI（`init` + `convert`）加 4 个自包含 Skill 包（schema-wizard / ingest / query / lint），每个 Skill 包含 SKILL.md + bash 校验脚本 + examples。

**Architecture:** Monorepo 布局。`packages/cli/` 是 npm 发布包（TypeScript，使用 commander + @clack/prompts + execa），`skills/` 下的 4 个 skill 包完全自包含（脚本内联共享逻辑，允许代码重复换取独立拷贝安装）。根仓库负责测试（vitest，通过 execa 驱动 bash 脚本）和文档。

**Tech Stack:**
- Node.js ≥ 20, TypeScript 5.x, pnpm workspace
- CLI: commander, @clack/prompts, execa, gray-matter
- 构建: tsup（ESM + CJS + types）
- 测试: vitest + execa（驱动 bash 脚本）
- Skill 脚本: bash 4+, jq, 标准 POSIX 工具
- 外部依赖：pandoc（convert 命令）、jq（校验脚本）

**File Structure:**
```
llm-wiki-kit/
├── package.json                # workspace root（pnpm）
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts            # 根级测试配置
├── .gitignore
├── .editorconfig
├── README.md
├── LICENSE
├── packages/
│   └── cli/
│       ├── package.json        # name: "llm-wiki-kit"
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── bin/llm-wiki-kit.js # shebang → dist/index.cjs
│       ├── src/
│       │   ├── index.ts
│       │   ├── commands/
│       │   │   ├── init.ts
│       │   │   └── convert.ts
│       │   └── lib/
│       │       ├── templates.ts       # 读取 templates/ 并做变量替换
│       │       ├── prompts.ts         # @clack/prompts 封装
│       │       ├── pandoc.ts          # 检测 + 运行 pandoc
│       │       ├── skills-installer.ts
│       │       ├── post-process.ts    # Pandoc 输出清洗
│       │       └── fs-utils.ts
│       └── templates/
│           ├── agent-instructions.md  # CLAUDE.md / AGENTS.md / COPILOT.md 共享源
│           ├── index.md
│           ├── log.md
│           ├── MOC.md
│           └── wiki-readme.md
├── skills/                     # 4 个完全自包含的 Skill 包
│   ├── schema-wizard/
│   │   ├── SKILL.md
│   │   ├── scripts/validate-schema.sh
│   │   └── examples/{personal-wiki.md,research-wiki.md}
│   ├── ingest/
│   │   ├── SKILL.md
│   │   ├── scripts/{validate-frontmatter.sh,validate-links.sh,validate-index-sync.sh}
│   │   └── examples/ingest-session.md
│   ├── query/
│   │   ├── SKILL.md
│   │   ├── scripts/validate-backfill.sh
│   │   └── examples/query-session.md
│   └── lint/
│       ├── SKILL.md
│       ├── scripts/{check-orphans.sh,check-frontmatter.sh,check-index-drift.sh,generate-health-base.sh}
│       └── examples/lint-session.md
├── tests/                      # 根级测试（驱动 CLI + 所有 Skill 脚本）
│   ├── fixtures/
│   │   ├── docs/sample.docx            # pandoc convert 测试素材
│   │   └── wiki/                       # 合规的 mini wiki，用于校验脚本
│   ├── cli/
│   │   ├── init.test.ts
│   │   └── convert.test.ts
│   └── skills/
│       ├── schema-wizard.test.ts
│       ├── ingest.test.ts
│       ├── query.test.ts
│       └── lint.test.ts
└── docs/
    ├── getting-started.md
    └── harness-design.md
```

**Decomposition rationale：**
- `packages/cli/` 和 `skills/` 严格分离，因为 Skill 必须能脱离 CLI 独立拷贝。
- CLI 内部按责任拆分：`commands/` 是入口，`lib/` 放可测试的纯逻辑。
- 测试统一放在根 `tests/`，不放进 `skills/*`，这样 skill 目录保持纯净可拷贝。
- 每个 Skill 脚本单文件单职责（参考 spec §5.2），内联所需工具函数。

---

## Phase 0 — Repository Initialization

目标：初始化 pnpm workspace、TypeScript 根配置、vitest、Git。

### Task 0.1: Init Git 仓库 + .gitignore

**Files:**
- Create: `.gitignore`
- Create: `.editorconfig`

- [ ] **Step 1: `git init` 并配置基础 gitignore**

```bash
cd /Users/jinchi/Documents/llm-wiki-kit
git init
```

- [ ] **Step 2: 写 `.gitignore`**

```gitignore
node_modules/
dist/
*.log
.DS_Store
.env
.env.local
coverage/
.vitest/
tmp/
.pnpm-store/
```

- [ ] **Step 3: 写 `.editorconfig`**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.sh]
indent_size = 2
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore .editorconfig
git commit -m "chore: init repo with gitignore and editorconfig"
```

### Task 0.2: pnpm Workspace 配置

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: 写 `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 2: 写根 `package.json`**

```json
{
  "name": "llm-wiki-kit-workspace",
  "version": "0.0.0",
  "private": true,
  "description": "Workspace root for llm-wiki-kit",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "pnpm -r typecheck",
    "lint:skills": "shellcheck skills/*/scripts/*.sh"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "execa": "^9.5.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: 安装依赖**

```bash
pnpm install
```

Expected: 安装成功，生成 `pnpm-lock.yaml`。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: set up pnpm workspace with vitest and execa"
```

### Task 0.3: 根 TypeScript 和 Vitest 配置

**Files:**
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 写 `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 2: 写 `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "packages/*/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/cli/src/**/*.ts"]
    }
  }
});
```

- [ ] **Step 3: 冒烟测试**

```bash
pnpm test --run --reporter=verbose
```

Expected: vitest 报告 "No test files found"。没有 error 即正常。

- [ ] **Step 4: Commit**

```bash
git add tsconfig.base.json vitest.config.ts
git commit -m "chore: add base tsconfig and vitest config"
```

---

## Phase 1 — CLI 骨架

目标：搭建 `packages/cli/`，可通过 `pnpm --filter llm-wiki-kit dev -- --version` 跑通。

### Task 1.1: CLI 包 package.json + tsconfig + tsup

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`

- [ ] **Step 1: 写 `packages/cli/package.json`**

```json
{
  "name": "llm-wiki-kit",
  "version": "0.1.0",
  "description": "CLI that scaffolds an LLM Wiki and installs skill packages",
  "type": "module",
  "bin": {
    "llm-wiki-kit": "./bin/llm-wiki-kit.js"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "bin",
    "dist",
    "templates",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "commander": "^12.1.0",
    "execa": "^9.5.0"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=20"
  },
  "keywords": ["llm", "wiki", "knowledge-base", "obsidian", "skill", "harness"],
  "license": "MIT"
}
```

- [ ] **Step 2: 写 `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 写 `packages/cli/tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20"
});
```

- [ ] **Step 4: 安装 CLI 依赖**

```bash
pnpm -C packages/cli install
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json packages/cli/tsup.config.ts pnpm-lock.yaml
git commit -m "chore(cli): scaffold cli package with commander + clack + tsup"
```

### Task 1.2: CLI 入口（commander 注册两个命令占位）

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/bin/llm-wiki-kit.js`
- Test: `tests/cli/smoke.test.ts`

- [ ] **Step 1: 写冒烟测试（失败）**

```typescript
// tests/cli/smoke.test.ts
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
```

- [ ] **Step 2: 运行测试，验证失败**

```bash
pnpm test tests/cli/smoke.test.ts
```

Expected: FAIL — CLI 入口不存在。

- [ ] **Step 3: 写 `packages/cli/src/index.ts`**

```typescript
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
  .action(async (opts) => {
    const { runInit } = await import("./commands/init.js");
    await runInit(opts);
  });

program
  .command("convert")
  .description("Batch-convert documents to Obsidian Markdown via pandoc")
  .requiredOption("-i, --input <dir>", "source directory")
  .requiredOption("-o, --output <dir>", "output directory")
  .action(async (opts) => {
    const { runConvert } = await import("./commands/convert.js");
    await runConvert(opts);
  });

program.parseAsync(process.argv);
```

- [ ] **Step 4: 写命令占位 stub**

创建 `packages/cli/src/commands/init.ts`：

```typescript
export interface InitOptions {
  yes?: boolean;
  path?: string;
  name?: string;
}

export async function runInit(_opts: InitOptions): Promise<void> {
  throw new Error("init not implemented");
}
```

创建 `packages/cli/src/commands/convert.ts`：

```typescript
export interface ConvertOptions {
  input: string;
  output: string;
}

export async function runConvert(_opts: ConvertOptions): Promise<void> {
  throw new Error("convert not implemented");
}
```

- [ ] **Step 5: 写 shebang 入口 `packages/cli/bin/llm-wiki-kit.js`**

```javascript
#!/usr/bin/env node
import("../dist/index.js");
```

使用 `chmod +x packages/cli/bin/llm-wiki-kit.js`。

- [ ] **Step 6: 运行测试，验证通过**

```bash
pnpm test tests/cli/smoke.test.ts
```

Expected: 两个测试都 PASS。

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src packages/cli/bin tests/cli/smoke.test.ts
git commit -m "feat(cli): scaffold commander entry with init and convert stubs"
```

---

## Phase 2 — CLI `init` 命令

目标：`npx llm-wiki-kit init` 交互式创建骨架目录 + 生成 index.md / log.md / MOC.md / CLAUDE.md / AGENTS.md / COPILOT.md / wiki README + 拷贝 skills/。

### Task 2.1: 模板文件（skeleton 内容）

**Files:**
- Create: `packages/cli/templates/agent-instructions.md`
- Create: `packages/cli/templates/index.md`
- Create: `packages/cli/templates/log.md`
- Create: `packages/cli/templates/MOC.md`
- Create: `packages/cli/templates/wiki-readme.md`

- [ ] **Step 1: 写 `agent-instructions.md`（CLAUDE/AGENTS/COPILOT 共享源）**

```markdown
# {{WIKI_NAME}} — LLM Wiki Schema

> 本文件是 LLM 操作本 wiki 的最小可用约定（schema）。如需定制化 schema，运行 `schema-wizard` Skill。

## 目录约定

| 目录 | 用途 |
|---|---|
| `raw/` | 原始素材（文档、网页剪藏、会议记录） |
| `wiki/domains/` | 领域总览页（如"计算机网络"、"机器学习"） |
| `wiki/entities/` | 具体事物（人、组织、产品） |
| `wiki/concepts/` | 抽象概念、术语 |
| `wiki/playbooks/` | 操作手册、SOP |
| `wiki/summaries/` | raw 文档的总结页 |

## Frontmatter 规范

所有 wiki/ 下的 Markdown 文件必须有 YAML frontmatter：

```yaml
---
type: summary | domain | entity | concept | playbook
title: 页面标题
tags: [tag1, tag2]
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [raw/xxx.md]   # summary 必填；其他可选
---
```

`type` 是必填，其值必须与所在目录一致（`wiki/summaries/` 下只能是 `summary`）。

## 链接规范

- 用 Obsidian 风格双向链接：`[[页面名]]` 或 `[[页面名|显示文本]]`
- 新建页面前先在 `index.md` 检查是否已存在
- 每次 ingest 后更新 `index.md` 和 `log.md`

## 工作流

本 wiki 支持三个由 Skill 驱动的工作流：

1. **ingest**（`skills/ingest/SKILL.md`）——把 raw 文档整理进 wiki
2. **query**（`skills/query/SKILL.md`）——回答用户问题并回填新知识
3. **lint**（`skills/lint/SKILL.md`）——定期健康检查 + 主动建议

## Skills 位置

本 wiki 的 skills 安装在 `{{SKILLS_DIR}}`。客户端如何加载：

- Claude Code：本文件（CLAUDE.md）会被自动读取，Skill 用 `Skill` 工具加载
- Codex：读取 AGENTS.md
- Copilot CLI：读取 COPILOT.md
- 其他客户端：把 SKILL.md 内容粘贴到 system prompt

## 校验脚本

Skill 工作流中会运行 `skills/*/scripts/*.sh` 校验脚本。依赖：`bash`、`jq`。
```

- [ ] **Step 2: 写 `index.md`**

```markdown
# {{WIKI_NAME}} — Index

> 本文件是 wiki 的总索引。由 ingest / lint Skill 自动维护。

## Domains

<!-- domain 列表占位 -->

## Entities

<!-- entity 列表占位 -->

## Concepts

<!-- concept 列表占位 -->

## Playbooks

<!-- playbook 列表占位 -->

## Summaries

<!-- summary 列表占位 -->
```

- [ ] **Step 3: 写 `log.md`**

```markdown
# {{WIKI_NAME}} — Change Log

> 每次 ingest / query / lint 在此追加一行。格式：`YYYY-MM-DD HH:MM | <action> | <target> | <note>`

<!-- ingest 2026-04-20 10:00 | ingest | raw/foo.md | 新增 summary: Foo -->
```

- [ ] **Step 4: 写 `MOC.md`**

```markdown
# {{WIKI_NAME}} — Map of Content

> 手工维护的导航地图。按主题群聚合，不追求完整性。

## 核心领域

<!-- 选择性列出最重要的 domain -->

## 常用 Playbooks

<!-- 高频使用的操作手册 -->
```

- [ ] **Step 5: 写 `wiki-readme.md`**

```markdown
# {{WIKI_NAME}}

基于 llm-wiki 模式的个人知识库。由 [llm-wiki-kit](https://github.com/<OWNER>/llm-wiki-kit) 初始化。

## 快速开始

1. 把原始素材放进 `raw/`
2. 让 LLM 加载 `skills/ingest/SKILL.md`，运行 ingest 工作流
3. 提问时让 LLM 加载 `skills/query/SKILL.md`
4. 定期运行 `skills/lint/SKILL.md` 做健康检查

## schema

见 `CLAUDE.md` / `AGENTS.md` / `COPILOT.md`（内容相同，给不同客户端读）。
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/templates
git commit -m "feat(cli): add skeleton templates for init command"
```

### Task 2.2: `lib/fs-utils.ts` + `lib/templates.ts`

**Files:**
- Create: `packages/cli/src/lib/fs-utils.ts`
- Create: `packages/cli/src/lib/templates.ts`
- Test: `tests/cli/templates.test.ts`

- [ ] **Step 1: 写失败测试 `tests/cli/templates.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { renderTemplate } from "../../packages/cli/src/lib/templates.js";

describe("renderTemplate", () => {
  it("replaces {{VAR}} with provided values", () => {
    const out = renderTemplate("Hello {{NAME}}!", { NAME: "World" });
    expect(out).toBe("Hello World!");
  });

  it("replaces multiple occurrences", () => {
    const out = renderTemplate("{{A}} and {{A}} and {{B}}", { A: "x", B: "y" });
    expect(out).toBe("x and x and y");
  });

  it("leaves unknown vars untouched", () => {
    const out = renderTemplate("{{UNKNOWN}}", {});
    expect(out).toBe("{{UNKNOWN}}");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test tests/cli/templates.test.ts
```

Expected: FAIL — module 不存在。

- [ ] **Step 3: 写 `lib/templates.ts`**

```typescript
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
```

- [ ] **Step 4: 写 `lib/fs-utils.ts`**

```typescript
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
```

- [ ] **Step 5: 运行测试验证通过**

```bash
pnpm test tests/cli/templates.test.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/lib tests/cli/templates.test.ts
git commit -m "feat(cli): add fs-utils and template renderer with tests"
```

### Task 2.3: `lib/prompts.ts`（@clack 封装）

**Files:**
- Create: `packages/cli/src/lib/prompts.ts`

- [ ] **Step 1: 写 `lib/prompts.ts`**

```typescript
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
```

- [ ] **Step 2: Typecheck**

```bash
pnpm -C packages/cli typecheck
```

Expected: 0 errors。

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/lib/prompts.ts
git commit -m "feat(cli): add @clack prompts wrapper for init"
```

### Task 2.4: Skills installer

**Files:**
- Create: `packages/cli/src/lib/skills-installer.ts`

- [ ] **Step 1: 写 `lib/skills-installer.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/lib/skills-installer.ts
git commit -m "feat(cli): add skills installer that copies skills/ into wiki"
```

### Task 2.5: `init` 命令实现 + 集成测试

**Files:**
- Modify: `packages/cli/src/commands/init.ts`
- Test: `tests/cli/init.test.ts`

- [ ] **Step 1: 写失败集成测试 `tests/cli/init.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execa } from "execa";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = path.resolve(__dirname, "../../packages/cli/src/index.ts");

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "lwk-init-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function runInit(args: string[] = []) {
  return execa(
    "pnpm",
    ["tsx", CLI_ENTRY, "init", "--yes", "--path", workDir, "--name", "Test Wiki", ...args],
    { reject: false, env: { ...process.env, NO_COLOR: "1" } }
  );
}

describe("init command", () => {
  it("creates wiki skeleton directories", async () => {
    const { exitCode } = await runInit();
    expect(exitCode).toBe(0);

    for (const d of ["raw", "wiki/domains", "wiki/entities", "wiki/concepts", "wiki/playbooks", "wiki/summaries"]) {
      const s = await stat(path.join(workDir, d));
      expect(s.isDirectory()).toBe(true);
    }
  });

  it("writes skeleton files with substituted wiki name", async () => {
    await runInit();
    const indexBody = await readFile(path.join(workDir, "index.md"), "utf8");
    expect(indexBody).toContain("Test Wiki — Index");
    expect(indexBody).not.toContain("{{WIKI_NAME}}");
  });

  it("generates all three agent instruction files", async () => {
    await runInit();
    for (const f of ["CLAUDE.md", "AGENTS.md", "COPILOT.md"]) {
      const body = await readFile(path.join(workDir, f), "utf8");
      expect(body).toContain("Test Wiki — LLM Wiki Schema");
    }
  });

  it("copies 4 skill packages to .llm-wiki-kit/skills/", async () => {
    await runInit();
    const skillsRoot = path.join(workDir, ".llm-wiki-kit/skills");
    for (const s of ["schema-wizard", "ingest", "query", "lint"]) {
      const skillMd = await stat(path.join(skillsRoot, s, "SKILL.md")).catch(() => null);
      expect(skillMd, `missing skill: ${s}`).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test tests/cli/init.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现 `commands/init.ts`**

```typescript
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
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm test tests/cli/init.test.ts
```

Expected: 所有 4 个测试 PASS。

- [ ] **Step 5: 手动冒烟**

```bash
rm -rf /tmp/smoke-wiki && pnpm --filter llm-wiki-kit dev -- init --yes --path /tmp/smoke-wiki --name "Smoke"
ls -la /tmp/smoke-wiki
```

Expected: 看到所有目录和文件。

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/init.ts tests/cli/init.test.ts
git commit -m "feat(cli): implement init command with skeleton + skills install"
```

---

## Phase 3 — CLI `convert` 命令

目标：调用 pandoc 把 `.docx/.html/.epub/.pptx` 转成 Obsidian Markdown，保留原文件名（含中文），跳过 `.pdf`。

### Task 3.1: `lib/pandoc.ts`（检测 + 运行）

**Files:**
- Create: `packages/cli/src/lib/pandoc.ts`
- Test: `tests/cli/pandoc.test.ts`

- [ ] **Step 1: 写失败测试 `tests/cli/pandoc.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { detectPandoc } from "../../packages/cli/src/lib/pandoc.js";

describe("detectPandoc", () => {
  it("returns version string when pandoc is available", async () => {
    const result = await detectPandoc();
    // 假定 CI 和开发机装了 pandoc；如未装则 expect installed === false
    if (result.installed) {
      expect(result.version).toMatch(/^\d+\.\d+/);
    } else {
      expect(result.hint).toMatch(/install/i);
    }
  });
});
```

- [ ] **Step 2: 实现 `lib/pandoc.ts`**

```typescript
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
  await execa("pandoc", [
    inputPath,
    "-o", outputPath,
    "--from=auto",
    "--to=gfm+wikilinks_title_after_pipe",
    "--wrap=none",
    "--standalone=false"
  ]);
}
```

- [ ] **Step 3: 运行测试**

```bash
pnpm test tests/cli/pandoc.test.ts
```

Expected: PASS（取决于 pandoc 是否装，两种分支都允许）。

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/lib/pandoc.ts tests/cli/pandoc.test.ts
git commit -m "feat(cli): add pandoc detection and conversion wrapper"
```

### Task 3.2: Pandoc 输出清洗

**Files:**
- Create: `packages/cli/src/lib/post-process.ts`
- Test: `tests/cli/post-process.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// tests/cli/post-process.test.ts
import { describe, it, expect } from "vitest";
import { postProcess } from "../../packages/cli/src/lib/post-process.js";

describe("postProcess", () => {
  it("collapses 3+ blank lines into max 2", () => {
    const input = "A\n\n\n\nB";
    expect(postProcess(input)).toBe("A\n\nB");
  });

  it("normalises CRLF to LF", () => {
    expect(postProcess("A\r\nB")).toBe("A\nB");
  });

  it("rewrites media/ image paths to assets/", () => {
    const input = "![x](media/image1.png)";
    expect(postProcess(input)).toBe("![x](assets/image1.png)");
  });

  it("leaves absolute http(s) urls alone", () => {
    const url = "![x](https://example.com/a.png)";
    expect(postProcess(url)).toBe(url);
  });
});
```

- [ ] **Step 2: 实现 `lib/post-process.ts`**

```typescript
export function postProcess(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/!\[([^\]]*)\]\(media\/([^)]+)\)/g, "![$1](assets/$2)")
    .replace(/\n{3,}/g, "\n\n");
}
```

- [ ] **Step 3: 运行测试**

```bash
pnpm test tests/cli/post-process.test.ts
```

Expected: 4 PASS。

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/lib/post-process.ts tests/cli/post-process.test.ts
git commit -m "feat(cli): add markdown post-process (image paths, whitespace)"
```

### Task 3.3: `convert` 命令实现 + 集成测试

**Files:**
- Modify: `packages/cli/src/commands/convert.ts`
- Test: `tests/cli/convert.test.ts`
- Create: `tests/fixtures/docs/sample.docx` (手动准备一个 mini docx)
- Create: `tests/fixtures/docs/skip-me.pdf` (空占位)

- [ ] **Step 1: 准备 fixture**

```bash
mkdir -p tests/fixtures/docs
# 用 pandoc 从一个简单 md 生成 sample.docx
printf "# Hello\n\n![logo](media/logo.png)\n\n段落内容。\n" > /tmp/sample.md
pandoc /tmp/sample.md -o tests/fixtures/docs/sample.docx
# 占位 pdf（内容无关，仅测试跳过）
printf "%%PDF-1.4\n" > tests/fixtures/docs/skip-me.pdf
```

- [ ] **Step 2: 写失败测试 `tests/cli/convert.test.ts`**

```typescript
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
    expect(stdout).toMatch(/PDF.*v2|后续版本/);
  });

  it("post-processes output (no media/ paths)", async () => {
    await runConvert();
    const body = await readFile(path.join(outDir, "sample.md"), "utf8");
    expect(body).not.toMatch(/media\//);
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

```bash
pnpm test tests/cli/convert.test.ts
```

Expected: FAIL。

- [ ] **Step 4: 实现 `commands/convert.ts`**

```typescript
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
```

- [ ] **Step 5: 运行测试**

```bash
pnpm test tests/cli/convert.test.ts
```

Expected: 3 PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/convert.ts tests/cli/convert.test.ts tests/fixtures/docs
git commit -m "feat(cli): implement convert command with pandoc + post-process"
```

---

## Phase 4 — Skill `schema-wizard`

目标：交付最简单的 Skill（1 个脚本），跑通 Skill 目录约定和测试 pattern。

### Task 4.1: `validate-schema.sh`

**Files:**
- Create: `skills/schema-wizard/scripts/validate-schema.sh`
- Test: `tests/skills/schema-wizard.test.ts`
- Create: `tests/fixtures/schema/valid.md`
- Create: `tests/fixtures/schema/missing-sections.md`

**脚本目标：** 检查用户定制化 schema 文件（`CLAUDE.md` 等）包含必要段落：`## 目录约定`、`## Frontmatter 规范`、`## 链接规范`、`## 工作流`。输出 JSON。

- [ ] **Step 1: 写 fixtures**

`tests/fixtures/schema/valid.md`：
```markdown
# My Wiki — LLM Wiki Schema

## 目录约定
...

## Frontmatter 规范
...

## 链接规范
...

## 工作流
...
```

`tests/fixtures/schema/missing-sections.md`：
```markdown
# Broken Wiki

## 目录约定
...
```

- [ ] **Step 2: 写失败测试 `tests/skills/schema-wizard.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "../../skills/schema-wizard/scripts/validate-schema.sh");
const FIX = path.resolve(__dirname, "../fixtures/schema");

async function runScript(file: string) {
  return execa("bash", [SCRIPT, file], { reject: false });
}

describe("validate-schema.sh", () => {
  it("returns status=pass for valid schema", async () => {
    const { stdout, exitCode } = await runScript(path.join(FIX, "valid.md"));
    expect(exitCode).toBe(0);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("pass");
    expect(out.errors).toEqual([]);
  });

  it("returns status=fail and lists missing sections", async () => {
    const { stdout, exitCode } = await runScript(path.join(FIX, "missing-sections.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    const rules = out.errors.map((e: { rule: string }) => e.rule);
    expect(rules).toContain("missing-section");
  });

  it("fails when file does not exist", async () => {
    const { stdout, exitCode } = await runScript(path.join(FIX, "nope.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    expect(out.errors[0].rule).toBe("file-not-found");
  });
});
```

- [ ] **Step 3: 运行验证失败**

```bash
pnpm test tests/skills/schema-wizard.test.ts
```

Expected: FAIL（脚本不存在）。

- [ ] **Step 4: 写脚本 `skills/schema-wizard/scripts/validate-schema.sh`**

```bash
#!/usr/bin/env bash
# validate-schema.sh — 检查 schema 文件包含必要段落
# 用法：bash validate-schema.sh <schema-file>
# 输出：JSON { status: "pass"|"fail", errors: [...] }

set -euo pipefail

FILE="${1:-}"

json_fail() {
  local rule="$1" message="$2" file="${3:-$FILE}"
  jq -nc --arg f "$file" --arg r "$rule" --arg m "$message" \
    '{status:"fail", errors:[{file:$f, rule:$r, message:$m}]}'
}

if [[ -z "$FILE" ]]; then
  echo '{"status":"fail","errors":[{"file":"","rule":"usage","message":"用法: validate-schema.sh <file>"}]}'
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  json_fail "file-not-found" "schema 文件不存在"
  exit 1
fi

REQUIRED_SECTIONS=("## 目录约定" "## Frontmatter 规范" "## 链接规范" "## 工作流")
MISSING=()

for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! grep -Fq "$section" "$FILE"; then
    MISSING+=("$section")
  fi
done

if (( ${#MISSING[@]} == 0 )); then
  jq -nc --arg f "$FILE" '{status:"pass", errors:[], file:$f}'
  exit 0
fi

ERRORS_JSON=$(
  printf '%s\n' "${MISSING[@]}" |
  jq -R --arg f "$FILE" \
    '{file:$f, rule:"missing-section", message:("缺少段落: " + .)}' |
  jq -s .
)

jq -nc --argjson errs "$ERRORS_JSON" '{status:"fail", errors:$errs}'
exit 1
```

- [ ] **Step 5: 赋可执行权限**

```bash
chmod +x skills/schema-wizard/scripts/validate-schema.sh
```

- [ ] **Step 6: 运行测试**

```bash
pnpm test tests/skills/schema-wizard.test.ts
```

Expected: 3 PASS。

- [ ] **Step 7: Commit**

```bash
git add skills/schema-wizard/scripts tests/fixtures/schema tests/skills/schema-wizard.test.ts
git commit -m "feat(skill/schema-wizard): add validate-schema.sh with tests"
```

### Task 4.2: `schema-wizard/SKILL.md`

**Files:**
- Create: `skills/schema-wizard/SKILL.md`

- [ ] **Step 1: 写 SKILL.md**

```markdown
---
name: schema-wizard
description: Use when user wants to customize the LLM Wiki schema beyond the minimal default — interactive conversation produces a tailored CLAUDE.md/AGENTS.md/COPILOT.md plus an initial wiki/health.base dashboard.
---

# schema-wizard Skill

## 何时使用

用户已经有一个用 `llm-wiki-kit init` 生成的 wiki 骨架，但想让 schema 更贴合自己领域，例如：
- 定义领域分类（如"计算机网络 / 机器学习 / 职业发展"）
- 给某类页面定制 frontmatter 字段（如 concept 页必填 `aliases`）
- 约定特殊命名规则（如 person entity 用姓氏前缀）

## 前置准备

### 方式 A：使用 llm-wiki-kit CLI（推荐）
已运行 `npx llm-wiki-kit init`，wiki 根目录已存在骨架文件。

### 方式 B：手动初始化
参考 `examples/personal-wiki.md` 了解最小骨架结构，手工创建目录和 schema 文件。

## 工作流

### Step 1 — 现状盘点

读取 wiki 根下的 `CLAUDE.md`（或 `AGENTS.md`），理解当前默认 schema。读取 `index.md`、`raw/` 下任意 1-2 个文件，了解用户已有的内容和风格。

### Step 2 — 需求访谈

和用户对话确认以下问题（一次问一个）：
1. 主要关注哪些领域？（列出 3-10 个）
2. 各领域是否有特殊的页面类型？
3. 有没有希望强制填写的 frontmatter 字段？
4. 链接命名有偏好吗？（如中文/英文、是否带前缀）
5. 是否要启用 wiki/health.base 仪表盘？

### Step 3 — 生成定制 schema

基于访谈结果，覆盖写 `CLAUDE.md`、`AGENTS.md`、`COPILOT.md`（内容一致）。保留原有段落结构（`## 目录约定` / `## Frontmatter 规范` / `## 链接规范` / `## 工作流`）——**这些段落名是后续校验脚本的硬约定，不能改**。

→ 完成后运行：`bash scripts/validate-schema.sh <wiki-root>/CLAUDE.md`

### Step 4 — 校验和修复循环（最多 2 次）

如果 validate-schema 报 `missing-section`，补齐段落重新运行。超过 2 次仍失败就把 JSON 报告给用户，由人工介入。

### Step 5 — 初始化 health.base（可选）

如果用户希望，参考 `lint` Skill 的 `generate-health-base.sh` 生成初始 `wiki/health.base`。

### Step 6 — 在 log.md 追加一条记录

```
YYYY-MM-DD HH:MM | schema-wizard | CLAUDE.md | 定制化 schema（域：…）
```

## 输出约束

- CLAUDE.md / AGENTS.md / COPILOT.md 三文件内容必须完全一致
- 必须保留 4 个段落标题（`## 目录约定`、`## Frontmatter 规范`、`## 链接规范`、`## 工作流`），其下内容可以定制
- 定制新的 frontmatter 字段时，要在对应 `wiki/<dir>/` 的页面类型里说明

## 校验脚本

- `scripts/validate-schema.sh <file>` — 检查段落完整性，JSON 输出

## 示例

- `examples/personal-wiki.md` — 个人知识库定制 schema
- `examples/research-wiki.md` — 研究者定制 schema
```

- [ ] **Step 2: Commit**

```bash
git add skills/schema-wizard/SKILL.md
git commit -m "feat(skill/schema-wizard): add SKILL.md workflow doc"
```

### Task 4.3: schema-wizard 示例

**Files:**
- Create: `skills/schema-wizard/examples/personal-wiki.md`
- Create: `skills/schema-wizard/examples/research-wiki.md`

- [ ] **Step 1: 写 `examples/personal-wiki.md`**

```markdown
# 示例：个人知识库定制 schema

> 假设用户场景：程序员 + 读书爱好者 + 偶尔做职业规划

## 访谈结论

- 领域：`计算机`、`阅读笔记`、`职业规划`
- 特殊页面类型：无
- 强制 frontmatter：所有页加 `status: active | archived`
- 命名：页面名用中文，目录名用英文

## 生成后的 CLAUDE.md（节选）

```markdown
## 目录约定
| 目录 | 用途 |
|---|---|
| `raw/` | 原始素材 |
| `wiki/domains/` | 领域总览（`计算机.md` / `阅读笔记.md` / `职业规划.md`） |
| `wiki/entities/` | 人、组织、产品、书籍 |
| `wiki/concepts/` | 抽象概念、术语 |
| `wiki/playbooks/` | 操作手册 |
| `wiki/summaries/` | raw 文档总结 |

## Frontmatter 规范
所有页面必填：`type`、`title`、`status`、`created`、`updated`。
`status` 值：`active` | `archived`。

## 链接规范
页面名用中文。书籍类 entity 加前缀"《》"，如 `[[《代码整洁之道》]]`。

## 工作流
（保留默认三个工作流的引用）
```
```

- [ ] **Step 2: 写 `examples/research-wiki.md`**

```markdown
# 示例：研究者定制 schema

> 假设用户场景：在读研究生，做 LLM + RAG 方向

## 访谈结论

- 领域：`LLM`、`RAG`、`评估方法`、`行业动态`
- 特殊页面类型：`paper`（论文笔记，归到 entities）
- 强制 frontmatter：paper 页必填 `authors`、`venue`、`year`、`bibkey`
- 命名：全英文

## 生成后的 CLAUDE.md（节选）

```markdown
## Frontmatter 规范

常规页面：
- `type`（必填）、`title`、`created`、`updated`、`tags`

paper 页面（`wiki/entities/` 下，`type: paper`）额外必填：
- `authors: [first-author, second-author, ...]`
- `venue: ACL | NeurIPS | arXiv | ...`
- `year: YYYY`
- `bibkey: first-author-year-shorttitle`

## 链接规范
全英文。Paper 用 bibkey 作为文件名，如 `lewis-2020-rag.md`。
```
```

- [ ] **Step 3: Commit**

```bash
git add skills/schema-wizard/examples
git commit -m "feat(skill/schema-wizard): add personal + research schema examples"
```

---

## Phase 5 — Skill `ingest`

目标：3 个校验脚本（frontmatter、links、index-sync）+ SKILL.md + 一个完整 ingest 会话示例。

### Task 5.1: 测试 fixtures — 合规 mini wiki

**Files:**
- Create: `tests/fixtures/wiki/` 下的一整套合规文件（作为后续所有 skill 测试共用 fixture）

- [ ] **Step 1: 创建 fixture 目录结构**

```bash
mkdir -p tests/fixtures/wiki/{raw,wiki/{domains,entities,concepts,playbooks,summaries}}
```

- [ ] **Step 2: 写 fixture 文件**

`tests/fixtures/wiki/wiki/summaries/dns-basics.md`：
```markdown
---
type: summary
title: DNS 基础
tags: [network, dns]
created: 2026-04-01
updated: 2026-04-01
sources: [raw/dns-intro.md]
---

# DNS 基础

DNS 是分布式命名系统。见 [[网络]] 域内 [[递归解析]] 概念。
```

`tests/fixtures/wiki/wiki/domains/网络.md`：
```markdown
---
type: domain
title: 网络
tags: [network]
created: 2026-04-01
updated: 2026-04-01
---

# 网络

相关：[[DNS 基础]]、[[递归解析]]
```

`tests/fixtures/wiki/wiki/concepts/递归解析.md`：
```markdown
---
type: concept
title: 递归解析
tags: [dns]
created: 2026-04-01
updated: 2026-04-01
---

# 递归解析

一种 DNS 查询模式。
```

`tests/fixtures/wiki/index.md`：
```markdown
# Test Wiki — Index

## Domains
- [[网络]]

## Concepts
- [[递归解析]]

## Summaries
- [[DNS 基础]]
```

`tests/fixtures/wiki/raw/dns-intro.md`：
```markdown
# DNS Intro (原始素材)
...
```

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures/wiki
git commit -m "test: add compliant mini-wiki fixture"
```

### Task 5.2: `validate-frontmatter.sh`

**Files:**
- Create: `skills/ingest/scripts/validate-frontmatter.sh`
- Test: `tests/skills/ingest.test.ts`（本任务先只加 frontmatter 部分）
- Create fixtures: `tests/fixtures/wiki-bad/wiki/summaries/missing-source.md`

**脚本目标：** 校验一个目录内所有 .md 文件的 frontmatter：
- `---` 块存在且闭合
- `type` 字段必填，值必须是 `summary|domain|entity|concept|playbook` 之一
- `type` 必须与目录一致（summaries/ 下 type==summary 等）
- `summary` 页面必须有 `sources` 字段
- 所有页面必须有 `title`、`created`、`updated`

- [ ] **Step 1: 准备坏数据 fixture**

```bash
mkdir -p tests/fixtures/wiki-bad/wiki/summaries
```

`tests/fixtures/wiki-bad/wiki/summaries/missing-source.md`：
```markdown
---
type: summary
title: 缺 source 的总结
created: 2026-04-01
updated: 2026-04-01
---

正文
```

`tests/fixtures/wiki-bad/wiki/concepts/wrong-type.md`：
```markdown
---
type: summary
title: 类型不对
created: 2026-04-01
updated: 2026-04-01
---

正文
```

- [ ] **Step 2: 写失败测试（加进 `tests/skills/ingest.test.ts`）**

```typescript
import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_SCRIPTS = path.resolve(__dirname, "../../skills/ingest/scripts");
const WIKI_OK = path.resolve(__dirname, "../fixtures/wiki");
const WIKI_BAD = path.resolve(__dirname, "../fixtures/wiki-bad");

async function run(script: string, arg: string) {
  return execa("bash", [path.join(SKILL_SCRIPTS, script), arg], { reject: false });
}

describe("validate-frontmatter.sh", () => {
  it("passes on compliant wiki", async () => {
    const { stdout, exitCode } = await run("validate-frontmatter.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports missing sources for summary page", async () => {
    const { stdout, exitCode } = await run("validate-frontmatter.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    const rules = out.errors.map((e: { rule: string }) => e.rule);
    expect(rules).toContain("missing-required-field");
    expect(rules).toContain("type-dir-mismatch");
  });
});
```

- [ ] **Step 3: 验证失败**

```bash
pnpm test tests/skills/ingest.test.ts
```

Expected: FAIL。

- [ ] **Step 4: 写 `skills/ingest/scripts/validate-frontmatter.sh`**

```bash
#!/usr/bin/env bash
# validate-frontmatter.sh — 全量校验 wiki/*.md 的 frontmatter
# 用法：bash validate-frontmatter.sh <wiki-root>
set -euo pipefail

WIKI_ROOT="${1:-.}"
if [[ ! -d "$WIKI_ROOT/wiki" ]]; then
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/ 子目录\"}]}"
  exit 1
fi

# 目录 → 期望 type
declare -A DIR_TYPE=(
  [domains]=domain
  [entities]=entity
  [concepts]=concept
  [playbooks]=playbook
  [summaries]=summary
)

ERRORS="[]"
push_error() {
  local file="$1" rule="$2" message="$3"
  ERRORS=$(jq -c --arg f "$file" --arg r "$rule" --arg m "$message" \
    '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
}

# 提取 frontmatter 块（第一个 --- 与下一个 --- 之间）
extract_frontmatter() {
  awk '/^---$/{c++; next} c==1{print} c==2{exit}' "$1"
}

get_field() {
  # $1: frontmatter text, $2: key
  echo "$1" | awk -v k="$2" 'BEGIN{IGNORECASE=0} $0 ~ "^"k":"{sub("^"k":[ ]*",""); print; exit}'
}

for dir in "${!DIR_TYPE[@]}"; do
  expected="${DIR_TYPE[$dir]}"
  d="$WIKI_ROOT/wiki/$dir"
  [[ -d "$d" ]] || continue
  while IFS= read -r -d '' file; do
    fm=$(extract_frontmatter "$file")
    if [[ -z "$fm" ]]; then
      push_error "$file" "missing-frontmatter" "未找到 --- frontmatter 块"
      continue
    fi
    type_val=$(get_field "$fm" type)
    title_val=$(get_field "$fm" title)
    created_val=$(get_field "$fm" created)
    updated_val=$(get_field "$fm" updated)

    [[ -z "$type_val"    ]] && push_error "$file" "missing-required-field" "缺少 type"
    [[ -z "$title_val"   ]] && push_error "$file" "missing-required-field" "缺少 title"
    [[ -z "$created_val" ]] && push_error "$file" "missing-required-field" "缺少 created"
    [[ -z "$updated_val" ]] && push_error "$file" "missing-required-field" "缺少 updated"

    case "$type_val" in
      summary|domain|entity|concept|playbook) ;;
      "") ;;
      *) push_error "$file" "invalid-type" "type 值非法: $type_val" ;;
    esac

    if [[ -n "$type_val" && "$type_val" != "$expected" ]]; then
      push_error "$file" "type-dir-mismatch" "目录 $dir 期望 type=$expected，实际 $type_val"
    fi

    if [[ "$expected" == "summary" ]]; then
      sources_val=$(get_field "$fm" sources)
      [[ -z "$sources_val" ]] && push_error "$file" "missing-required-field" "summary 页缺少 sources"
    fi
  done < <(find "$d" -maxdepth 1 -type f -name '*.md' -print0)
done

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
```

- [ ] **Step 5: 赋权限 + 运行测试**

```bash
chmod +x skills/ingest/scripts/validate-frontmatter.sh
pnpm test tests/skills/ingest.test.ts
```

Expected: 2 PASS。

- [ ] **Step 6: Commit**

```bash
git add skills/ingest/scripts/validate-frontmatter.sh tests/fixtures/wiki-bad tests/skills/ingest.test.ts
git commit -m "feat(skill/ingest): add validate-frontmatter.sh with mini fixture"
```

### Task 5.3: `validate-links.sh`

**Files:**
- Create: `skills/ingest/scripts/validate-links.sh`
- Modify: `tests/skills/ingest.test.ts`（追加测试）
- Modify fixtures: 增加一个带断链的文件

**脚本目标：** 遍历所有 `wiki/**/*.md`，提取 `[[X]]` 或 `[[X|Y]]` 中的 X（页面名），检查 wiki/ 下是否存在 `X.md` 文件。断链输出 JSON。

- [ ] **Step 1: 追加坏数据 fixture**

`tests/fixtures/wiki-bad/wiki/summaries/broken-link.md`：
```markdown
---
type: summary
title: 断链示例
created: 2026-04-01
updated: 2026-04-01
sources: [raw/foo.md]
---

见 [[不存在的页面]] 和 [[也不存在|显示名]]。
```

- [ ] **Step 2: 追加测试**

```typescript
describe("validate-links.sh", () => {
  it("passes on wiki with all links resolvable", async () => {
    const { stdout, exitCode } = await run("validate-links.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports broken wiki links", async () => {
    const { stdout, exitCode } = await run("validate-links.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.status).toBe("fail");
    const targets = out.errors.map((e: { message: string }) => e.message);
    expect(targets.some((m: string) => m.includes("不存在的页面"))).toBe(true);
    expect(targets.some((m: string) => m.includes("也不存在"))).toBe(true);
  });
});
```

- [ ] **Step 3: 写脚本**

```bash
#!/usr/bin/env bash
# validate-links.sh — 校验 wiki link [[X]] 指向的页面存在
# 用法：bash validate-links.sh <wiki-root>
set -euo pipefail

WIKI_ROOT="${1:-.}"
[[ -d "$WIKI_ROOT/wiki" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/ 子目录\"}]}"
  exit 1
}

# 收集所有页面（basename 不含扩展名）
declare -A PAGES=()
while IFS= read -r -d '' f; do
  base=$(basename "$f" .md)
  PAGES["$base"]=1
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

ERRORS="[]"
push_error() {
  local file="$1" target="$2"
  ERRORS=$(jq -c --arg f "$file" --arg r "broken-link" --arg m "目标页面不存在: [[$target]]" \
    '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
}

while IFS= read -r -d '' f; do
  # 提取 [[X]] 或 [[X|Y]] 的 X
  while IFS= read -r target; do
    [[ -z "$target" ]] && continue
    name="${target%%|*}"                # 去掉 | 后半
    name="${name## }"; name="${name%% }" # trim
    if [[ -z "${PAGES[$name]:-}" ]]; then
      push_error "$f" "$name"
    fi
  done < <(grep -oE '\[\[[^]]+\]\]' "$f" | sed -E 's/^\[\[|\]\]$//g')
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
```

- [ ] **Step 4: 赋权 + 测试**

```bash
chmod +x skills/ingest/scripts/validate-links.sh
pnpm test tests/skills/ingest.test.ts
```

Expected: 4 PASS（累加）。

- [ ] **Step 5: Commit**

```bash
git add skills/ingest/scripts/validate-links.sh tests/fixtures/wiki-bad tests/skills/ingest.test.ts
git commit -m "feat(skill/ingest): add validate-links.sh"
```

### Task 5.4: `validate-index-sync.sh`

**Files:**
- Create: `skills/ingest/scripts/validate-index-sync.sh`
- Modify: `tests/skills/ingest.test.ts`

**脚本目标：** 对比 `index.md` 中列出的 `[[页面]]` 条目与 `wiki/` 实际存在的 .md 文件，输出两种偏移：
- `index-missing-page`：实际存在但 index 没列
- `index-orphan-entry`：index 列了但文件不存在

- [ ] **Step 1: 追加坏数据**

`tests/fixtures/wiki-bad/index.md`：
```markdown
# Bad Wiki — Index

## Summaries
- [[幽灵页面]]
```
（同时 `tests/fixtures/wiki-bad/wiki/summaries/broken-link.md` 未被 index 收录——双向偏移）

- [ ] **Step 2: 追加测试**

```typescript
describe("validate-index-sync.sh", () => {
  it("passes when index matches reality", async () => {
    const { stdout, exitCode } = await run("validate-index-sync.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports index missing a page and orphan entry", async () => {
    const { stdout, exitCode } = await run("validate-index-sync.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    const rules = new Set(out.errors.map((e: { rule: string }) => e.rule));
    expect(rules.has("index-missing-page")).toBe(true);
    expect(rules.has("index-orphan-entry")).toBe(true);
  });
});
```

- [ ] **Step 3: 写脚本**

```bash
#!/usr/bin/env bash
# validate-index-sync.sh — 校验 index.md 与实际 wiki 文件一致
# 用法：bash validate-index-sync.sh <wiki-root>
set -euo pipefail

WIKI_ROOT="${1:-.}"
INDEX="$WIKI_ROOT/index.md"

[[ -f "$INDEX" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$INDEX\",\"rule\":\"missing-index\",\"message\":\"index.md 不存在\"}]}"
  exit 1
}

# 实际页面集合
declare -A ACTUAL=()
while IFS= read -r -d '' f; do
  ACTUAL[$(basename "$f" .md)]=1
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

# index.md 列出的页面集合
declare -A LISTED=()
while IFS= read -r name; do
  name="${name%%|*}"; name="${name## }"; name="${name%% }"
  [[ -n "$name" ]] && LISTED[$name]=1
done < <(grep -oE '\[\[[^]]+\]\]' "$INDEX" | sed -E 's/^\[\[|\]\]$//g')

ERRORS="[]"
push() {
  ERRORS=$(jq -c --arg f "$1" --arg r "$2" --arg m "$3" '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
}

for p in "${!ACTUAL[@]}"; do
  [[ -z "${LISTED[$p]:-}" ]] && push "$INDEX" "index-missing-page" "index.md 未列出: [[$p]]"
done
for p in "${!LISTED[@]}"; do
  [[ -z "${ACTUAL[$p]:-}" ]] && push "$INDEX" "index-orphan-entry" "index.md 列了不存在的页: [[$p]]"
done

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
```

- [ ] **Step 4: 赋权 + 测试**

```bash
chmod +x skills/ingest/scripts/validate-index-sync.sh
pnpm test tests/skills/ingest.test.ts
```

Expected: 6 PASS（累加）。

- [ ] **Step 5: Commit**

```bash
git add skills/ingest/scripts/validate-index-sync.sh tests/fixtures/wiki-bad tests/skills/ingest.test.ts
git commit -m "feat(skill/ingest): add validate-index-sync.sh"
```

### Task 5.5: `ingest/SKILL.md` + example

**Files:**
- Create: `skills/ingest/SKILL.md`
- Create: `skills/ingest/examples/ingest-session.md`

- [ ] **Step 1: 写 `skills/ingest/SKILL.md`**

```markdown
---
name: ingest
description: Use when the user wants to ingest a raw document from raw/ into the wiki — LLM drives a 7-step workflow with 3 validation gates.
---

# ingest Skill

## 何时使用

用户说 "ingest raw/xxx.md"、"把这个文档整理进 wiki"、"分析并归档这篇文章"。

## 前置准备

### 方式 A：使用 llm-wiki-kit CLI（推荐）
已运行 `npx llm-wiki-kit init`，wiki 结构和 schema 文件齐全。

### 方式 B：手动初始化
至少存在 `wiki/{domains,entities,concepts,playbooks,summaries}/`、`index.md`、`log.md`，以及定义了目录/frontmatter/链接规范的 schema 文件。

## 工作流步骤

### Step 1 — 读 raw 文档全文
用 Read 工具读取完整内容。如果是长文，先整体通读一遍再分节处理。

### Step 2 — 与用户讨论关键要点
列出 5-10 个你提取的要点，让用户确认/修正。**这一步不可跳过**——LLM 单方面提炼的 summary 往往偏离用户关注。

### Step 3 — 写 summary 页到 `wiki/summaries/<文件名>.md`

frontmatter 必备字段：
```yaml
---
type: summary
title: <与用户商定的标题>
tags: [...]
created: <today>
updated: <today>
sources: [raw/<原始文件>]
---
```

正文结构：一句话摘要 / 要点列表 / 延伸链接（到 domain/entity/concept）。

→ 完成后运行：`bash scripts/validate-frontmatter.sh <wiki-root>`

如果报错：按 JSON 指示修复，重试最多 2 次。

### Step 4 — 识别并更新 entities / concepts

从 summary 中提取人/组织/产品/术语，检查 `wiki/entities/` 和 `wiki/concepts/` 是否存在对应页面：
- 存在 → 补充新信息（更新 `updated` 字段）
- 不存在 → 创建新页面（简短定义 + 反向链接回 summary）

→ 完成后运行：`bash scripts/validate-links.sh <wiki-root>`

### Step 5 — 更新 domain 页

找到 summary 所属 domain（如"网络"），在 domain 页的"相关"段落追加 `[[新 summary]]`。

### Step 6 — 更新 index.md

在对应分节（Summaries / Concepts / ...）添加条目。
→ 完成后运行：`bash scripts/validate-index-sync.sh <wiki-root>`

### Step 7 — 追加 log.md

```
YYYY-MM-DD HH:MM | ingest | raw/<原文> | 新增 summary: <title>（+<N> 个新 concept/entity）
```

## 输出约束

- 文件名保持原中文名，不强制转拼音
- 任何新页面必须通过 3 个校验脚本
- 最多 2 次修复重试，仍失败就把 JSON 报告给用户

## 校验脚本

- `scripts/validate-frontmatter.sh <wiki-root>` — 每个页面 frontmatter 合规
- `scripts/validate-links.sh <wiki-root>` — `[[X]]` 指向存在的页面
- `scripts/validate-index-sync.sh <wiki-root>` — index.md 与实际文件一致

## 示例

- `examples/ingest-session.md` — 一次完整的 DNS 文档 ingest 会话
```

- [ ] **Step 2: 写 `examples/ingest-session.md`**

```markdown
# 示例：一次完整的 ingest 会话

> 场景：用户把一篇"DNS 基础学习"笔记放进 raw/，让 LLM ingest。

## User
ingest raw/feishu_exports/DNS基础学习.md

## LLM（Step 1-2）
[读取文档后]

这篇笔记的要点我提取如下，请确认：

1. DNS 是分布式命名系统，把域名映射到 IP
2. 核心概念：递归解析 vs 迭代解析
3. 常见记录类型：A / AAAA / CNAME / MX / TXT
4. 缓存机制：TTL 和递归服务器缓存
5. 实践工具：dig、nslookup

是否有遗漏或想调整的？

## User
加一条："DNSSEC 签名验证"

## LLM（Step 3）
好，生成 summary：

写入 `wiki/summaries/DNS基础学习.md`，运行 validate-frontmatter：
```json
{"status":"pass","errors":[]}
```

## LLM（Step 4）
识别到新 concepts：
- 递归解析（不存在，创建）
- 迭代解析（不存在，创建）
- DNSSEC（不存在，创建）
- DNS 记录类型（存在，补充）

运行 validate-links：
```json
{"status":"fail","errors":[{"file":"wiki/summaries/DNS基础学习.md","rule":"broken-link","message":"目标页面不存在: [[缓存]]"}]}
```

修复：把 `[[缓存]]` 改成 `[[DNS 缓存]]` 并创建对应 concept 页。重跑 pass。

## LLM（Step 5-7）
- domain 页 `wiki/domains/网络.md` 追加链接
- index.md 新增 3 条 concept + 1 条 summary
- 运行 validate-index-sync → pass
- log.md 追加：`2026-04-20 10:30 | ingest | raw/feishu_exports/DNS基础学习.md | 新增 summary + 4 concepts`

完成。共新增 5 个页面，修改 2 个。
```

- [ ] **Step 3: Commit**

```bash
git add skills/ingest/SKILL.md skills/ingest/examples
git commit -m "feat(skill/ingest): add SKILL.md workflow and session example"
```

---

## Phase 6 — Skill `query`

目标：1 个校验脚本（回填校验） + SKILL.md + example。

### Task 6.1: `validate-backfill.sh`

**Files:**
- Create: `skills/query/scripts/validate-backfill.sh`
- Test: `tests/skills/query.test.ts`

**脚本目标：** 校验 query 产生的"回填页"——确保新建页面满足最小要求：
- frontmatter 完整（type/title/created/updated）
- 至少有 1 个反向链接指向某个已存在页面（避免孤立节点）
- 若类型是 summary，必须有 sources

脚本接收**单个文件路径**（不同于 ingest 的目录级校验）。

- [ ] **Step 1: 准备 fixture**

`tests/fixtures/backfill/good.md`：
```markdown
---
type: concept
title: 回填概念
created: 2026-04-01
updated: 2026-04-01
---

源自 [[网络]]。
```

`tests/fixtures/backfill/orphan.md`：
```markdown
---
type: concept
title: 孤立概念
created: 2026-04-01
updated: 2026-04-01
---

没有任何链接。
```

`tests/fixtures/backfill/missing-field.md`：
```markdown
---
type: concept
title: 缺字段
---

[[网络]]
```

- [ ] **Step 2: 写失败测试**

```typescript
// tests/skills/query.test.ts
import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "../../skills/query/scripts/validate-backfill.sh");
const FIX = path.resolve(__dirname, "../fixtures/backfill");

async function run(file: string) {
  return execa("bash", [SCRIPT, file], { reject: false });
}

describe("validate-backfill.sh", () => {
  it("passes on good backfill page", async () => {
    const { stdout, exitCode } = await run(path.join(FIX, "good.md"));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("flags orphan (no outbound links)", async () => {
    const { stdout, exitCode } = await run(path.join(FIX, "orphan.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.errors.some((e: { rule: string }) => e.rule === "no-links")).toBe(true);
  });

  it("flags missing required field", async () => {
    const { stdout, exitCode } = await run(path.join(FIX, "missing-field.md"));
    expect(exitCode).toBe(1);
    const out = JSON.parse(stdout);
    expect(out.errors.some((e: { rule: string }) => e.rule === "missing-required-field")).toBe(true);
  });
});
```

- [ ] **Step 3: 验证失败**

```bash
pnpm test tests/skills/query.test.ts
```

- [ ] **Step 4: 写脚本**

```bash
#!/usr/bin/env bash
# validate-backfill.sh — 校验单个回填页的最小要求
# 用法：bash validate-backfill.sh <file>
set -euo pipefail

FILE="${1:-}"
[[ -f "$FILE" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$FILE\",\"rule\":\"file-not-found\",\"message\":\"文件不存在\"}]}"
  exit 1
}

extract_frontmatter() {
  awk '/^---$/{c++; next} c==1{print} c==2{exit}' "$1"
}
get_field() {
  echo "$1" | awk -v k="$2" '$0 ~ "^"k":"{sub("^"k":[ ]*",""); print; exit}'
}

ERRORS="[]"
push() { ERRORS=$(jq -c --arg f "$1" --arg r "$2" --arg m "$3" '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS"); }

fm=$(extract_frontmatter "$FILE")
[[ -z "$fm" ]] && push "$FILE" "missing-frontmatter" "未找到 --- 块"

type_val=$(get_field "$fm" type)
title_val=$(get_field "$fm" title)
created_val=$(get_field "$fm" created)
updated_val=$(get_field "$fm" updated)

[[ -z "$type_val"    ]] && push "$FILE" "missing-required-field" "缺 type"
[[ -z "$title_val"   ]] && push "$FILE" "missing-required-field" "缺 title"
[[ -z "$created_val" ]] && push "$FILE" "missing-required-field" "缺 created"
[[ -z "$updated_val" ]] && push "$FILE" "missing-required-field" "缺 updated"

if [[ "$type_val" == "summary" ]]; then
  [[ -z "$(get_field "$fm" sources)" ]] && push "$FILE" "missing-required-field" "summary 缺 sources"
fi

# 正文是否有 [[X]]
body=$(awk '/^---$/{c++; next} c>=2{print}' "$FILE")
if ! grep -qE '\[\[[^]]+\]\]' <<< "$body"; then
  push "$FILE" "no-links" "回填页正文没有任何 [[X]] 反向链接"
fi

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc --arg f "$FILE" '{status:"pass", errors:[], file:$f}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
```

- [ ] **Step 5: 赋权 + 测试 + Commit**

```bash
chmod +x skills/query/scripts/validate-backfill.sh
pnpm test tests/skills/query.test.ts
```

```bash
git add skills/query/scripts tests/fixtures/backfill tests/skills/query.test.ts
git commit -m "feat(skill/query): add validate-backfill.sh"
```

### Task 6.2: `query/SKILL.md` + example

**Files:**
- Create: `skills/query/SKILL.md`
- Create: `skills/query/examples/query-session.md`

- [ ] **Step 1: 写 `SKILL.md`**

```markdown
---
name: query
description: Use when the user asks a question that can be answered from the wiki — LLM answers, then optionally backfills new knowledge as properly validated pages.
---

# query Skill

## 何时使用

用户提问："wiki 里 DNS 怎么处理？"、"我之前记过 TCP 的东西在哪？"、"结合我的笔记解释一下 X"。

## 前置准备

同 ingest Skill。wiki 已初始化。

## 工作流

### Step 1 — 定位相关页面
用 Read / Grep 从 `wiki/` 检索与问题相关的文件。优先读 `index.md` 和 `MOC.md` 找切入点。

### Step 2 — 组织答案
基于检索到的内容回答用户。**明确标注哪些是 wiki 已有、哪些是 LLM 补充**——这是 harness 的关键诚实要求。

### Step 3 — 决定是否回填
如果 Step 2 中 LLM 补充了 wiki 没有的关键信息，且用户对答案满意，主动问："要把这些新内容回填到 wiki 吗？"

### Step 4 — 回填（如用户同意）
为每个新信息点创建页面，类型选 concept / entity / playbook / summary 之一。每个新页面必须：
- frontmatter 完整
- 在正文链接回至少一个已有页面

→ 每个新页面运行：`bash scripts/validate-backfill.sh <new-file>`

失败就按 JSON 修复，最多 2 次。

### Step 5 — 更新 index.md 和 log.md
追加新页面条目。`log.md` 记一行：
```
YYYY-MM-DD HH:MM | query | <问题摘要> | 回填 +<N> 个页面
```

## 输出约束

- 答案必须区分"wiki 原有" vs "LLM 补充"
- 回填页必须通过 validate-backfill
- 不主动回填（Step 3）没有用户确认的内容

## 校验脚本

- `scripts/validate-backfill.sh <file>` — 单页最小要求

## 示例

- `examples/query-session.md`
```

- [ ] **Step 2: 写 `examples/query-session.md`**

```markdown
# 示例：query 会话

## User
wiki 里关于 DNS 的内容总结一下。

## LLM（Step 1-2）
从 wiki 中找到：
- `wiki/summaries/DNS基础学习.md`（wiki 原有）
- `wiki/concepts/递归解析.md`（wiki 原有）
- `wiki/concepts/迭代解析.md`（wiki 原有）

**wiki 已有：** DNS 是分布式命名系统；核心概念包括递归解析和迭代解析；常见记录类型 A/AAAA/CNAME/MX/TXT。

**LLM 补充：** 实际生产环境中大规模部署经常搭配 Anycast 做就近解析，你的 wiki 里没有这部分。

## LLM（Step 3）
要把 "Anycast DNS 部署模式" 回填进 wiki 吗？

## User
嗯，回填一下。

## LLM（Step 4）
新建 `wiki/concepts/Anycast DNS.md`：

```markdown
---
type: concept
title: Anycast DNS
tags: [dns, network]
created: 2026-04-20
updated: 2026-04-20
---

一种基于 Anycast 路由的 DNS 部署模式，多个节点共享 IP。
反向链接：[[DNS 基础学习]]、[[递归解析]]。
```

运行 validate-backfill：
```json
{"status":"pass"}
```

## LLM（Step 5）
- index.md 在 Concepts 追加 `- [[Anycast DNS]]`
- log.md：`2026-04-20 14:02 | query | DNS 总结 | 回填 +1 Anycast DNS`
```

- [ ] **Step 3: Commit**

```bash
git add skills/query/SKILL.md skills/query/examples
git commit -m "feat(skill/query): add SKILL.md workflow and session example"
```

---

## Phase 7 — Skill `lint`

目标：4 个脚本 + SKILL.md + example。lint 脚本是 ingest 校验的**超集**（全量检查），并新增 orphan 检测和 health.base 生成。

### Task 7.1: `check-frontmatter.sh`

**实现说明：** 功能等同 `ingest/validate-frontmatter.sh`（全量 frontmatter 检查），代码完整内联一份以保持 Skill 自包含（符合 spec §5.4 "允许少量重复换取独立可安装性"）。

**Files:**
- Create: `skills/lint/scripts/check-frontmatter.sh`
- Test: `tests/skills/lint.test.ts`

- [ ] **Step 1: 写失败测试（在 `tests/skills/lint.test.ts`）**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execa } from "execa";
import { mkdtemp, rm, cp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(__dirname, "../../skills/lint/scripts");
const WIKI_OK = path.resolve(__dirname, "../fixtures/wiki");
const WIKI_BAD = path.resolve(__dirname, "../fixtures/wiki-bad");

async function run(script: string, arg: string) {
  return execa("bash", [path.join(SCRIPTS, script), arg], { reject: false });
}

describe("check-frontmatter.sh", () => {
  it("passes on clean wiki", async () => {
    const { stdout, exitCode } = await run("check-frontmatter.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("fails with same kinds of errors as ingest's validator", async () => {
    const { stdout, exitCode } = await run("check-frontmatter.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const rules = new Set(
      JSON.parse(stdout).errors.map((e: { rule: string }) => e.rule)
    );
    expect(rules.has("missing-required-field") || rules.has("type-dir-mismatch")).toBe(true);
  });
});
```

- [ ] **Step 2: 写脚本（复用 ingest 的 validate-frontmatter 代码，内联）**

复制 `skills/ingest/scripts/validate-frontmatter.sh` 的内容到 `skills/lint/scripts/check-frontmatter.sh`，修改文件头注释为：

```bash
#!/usr/bin/env bash
# check-frontmatter.sh — 全量 frontmatter 合规检查（lint 用，ingest 的超集）
# 用法：bash check-frontmatter.sh <wiki-root>
```

其余正文完全一致（允许重复，每个 Skill 自包含）。

- [ ] **Step 3: 赋权 + 测试 + commit**

```bash
chmod +x skills/lint/scripts/check-frontmatter.sh
pnpm test tests/skills/lint.test.ts
```

```bash
git add skills/lint/scripts/check-frontmatter.sh tests/skills/lint.test.ts
git commit -m "feat(skill/lint): add check-frontmatter.sh (inline copy for self-containment)"
```

### Task 7.2: `check-index-drift.sh`

**实现说明：** 与 `ingest/validate-index-sync.sh` 等价，内联复制。

**Files:**
- Create: `skills/lint/scripts/check-index-drift.sh`

- [ ] **Step 1: 追加测试到 `tests/skills/lint.test.ts`**

```typescript
describe("check-index-drift.sh", () => {
  it("passes on synced index", async () => {
    const { stdout, exitCode } = await run("check-index-drift.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports drift", async () => {
    const { stdout, exitCode } = await run("check-index-drift.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const rules = new Set(
      JSON.parse(stdout).errors.map((e: { rule: string }) => e.rule)
    );
    expect(rules.has("index-missing-page") || rules.has("index-orphan-entry")).toBe(true);
  });
});
```

- [ ] **Step 2: 复制 `skills/ingest/scripts/validate-index-sync.sh` 到 `skills/lint/scripts/check-index-drift.sh`**

修改文件头注释为：
```bash
#!/usr/bin/env bash
# check-index-drift.sh — 检查 index.md 与 wiki/ 实际文件偏移
# 用法：bash check-index-drift.sh <wiki-root>
```

其余内容相同。

- [ ] **Step 3: 赋权 + 测试 + commit**

```bash
chmod +x skills/lint/scripts/check-index-drift.sh
pnpm test tests/skills/lint.test.ts
```

```bash
git add skills/lint/scripts/check-index-drift.sh tests/skills/lint.test.ts
git commit -m "feat(skill/lint): add check-index-drift.sh"
```

### Task 7.3: `check-orphans.sh`

**脚本目标：** 找出 `wiki/` 下所有"没有任何入站链接"的页面（index.md / log.md / MOC.md 不算入站源，因为它们是自动化索引）。输出 JSON。

**Files:**
- Create: `skills/lint/scripts/check-orphans.sh`
- Modify: `tests/skills/lint.test.ts`
- Modify fixtures: 在 wiki-bad 增加一个无入站链接的页面

- [ ] **Step 1: 追加坏数据**

`tests/fixtures/wiki-bad/wiki/concepts/孤儿概念.md`：
```markdown
---
type: concept
title: 孤儿概念
created: 2026-04-01
updated: 2026-04-01
---

正文。没人链过来。
```

- [ ] **Step 2: 追加测试**

```typescript
describe("check-orphans.sh", () => {
  it("passes when every page has inbound link", async () => {
    const { stdout, exitCode } = await run("check-orphans.sh", WIKI_OK);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).status).toBe("pass");
  });

  it("reports orphans", async () => {
    const { stdout, exitCode } = await run("check-orphans.sh", WIKI_BAD);
    expect(exitCode).toBe(1);
    const messages = JSON.parse(stdout).errors.map((e: { message: string }) => e.message);
    expect(messages.some((m: string) => m.includes("孤儿概念"))).toBe(true);
  });
});
```

- [ ] **Step 3: 写脚本**

```bash
#!/usr/bin/env bash
# check-orphans.sh — 找出无入站链接的 wiki 页面
# 用法：bash check-orphans.sh <wiki-root>
# 说明：index.md / log.md / MOC.md 中的链接不算入站源，因为它们是自动化索引。
set -euo pipefail

WIKI_ROOT="${1:-.}"
[[ -d "$WIKI_ROOT/wiki" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/\"}]}"
  exit 1
}

declare -A ALL_PAGES=()
while IFS= read -r -d '' f; do
  ALL_PAGES[$(basename "$f" .md)]="$f"
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

# 收集所有入站链接目标（排除 index/log/MOC）
declare -A INBOUND=()
while IFS= read -r -d '' f; do
  base=$(basename "$f")
  if [[ "$f" == "$WIKI_ROOT/index.md" || "$f" == "$WIKI_ROOT/log.md" || "$f" == "$WIKI_ROOT/MOC.md" ]]; then
    continue
  fi
  while IFS= read -r target; do
    name="${target%%|*}"; name="${name## }"; name="${name%% }"
    [[ -n "$name" ]] && INBOUND["$name"]=1
  done < <(grep -oE '\[\[[^]]+\]\]' "$f" | sed -E 's/^\[\[|\]\]$//g')
done < <(find "$WIKI_ROOT" -type f -name '*.md' -print0)

ERRORS="[]"
for p in "${!ALL_PAGES[@]}"; do
  if [[ -z "${INBOUND[$p]:-}" ]]; then
    ERRORS=$(jq -c --arg f "${ALL_PAGES[$p]}" --arg r "orphan" --arg m "孤立页面：无入站链接：$p" \
      '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
  fi
done

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
```

- [ ] **Step 4: 赋权 + 测试 + commit**

```bash
chmod +x skills/lint/scripts/check-orphans.sh
pnpm test tests/skills/lint.test.ts
```

```bash
git add skills/lint/scripts/check-orphans.sh tests/fixtures/wiki-bad tests/skills/lint.test.ts
git commit -m "feat(skill/lint): add check-orphans.sh"
```

### Task 7.4: `generate-health-base.sh`

**脚本目标：** 生成 / 更新 `wiki/health.base`，Obsidian Bases 格式（YAML），展示 wiki 健康指标。v1 提供的字段：
- `total_pages`
- `orphans_count`
- `frontmatter_errors_count`
- `index_drift_count`
- `last_ingest_at`（从 log.md 最后一条 `ingest` 抽）

**Files:**
- Create: `skills/lint/scripts/generate-health-base.sh`
- Modify: `tests/skills/lint.test.ts`

- [ ] **Step 1: 追加测试**

```typescript
describe("generate-health-base.sh", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "lwk-lint-"));
    await cp(WIKI_OK, workDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("creates wiki/health.base with expected fields", async () => {
    const { exitCode } = await run("generate-health-base.sh", workDir);
    expect(exitCode).toBe(0);
    const body = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
    expect(body).toMatch(/^filters:/m);
    expect(body).toMatch(/total_pages:/);
    expect(body).toMatch(/orphans_count:/);
    expect(body).toMatch(/frontmatter_errors_count:/);
    expect(body).toMatch(/index_drift_count:/);
  });

  it("is idempotent (second run overwrites cleanly)", async () => {
    await run("generate-health-base.sh", workDir);
    const a = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
    await run("generate-health-base.sh", workDir);
    const b = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
    expect(b).toBe(a);
  });
});
```

（注意：顶部已有的 `import {..., writeFile, readFile}` 可能需要调整——如果最早 import 里没有 readFile / cp，在文件顶部补充。）

- [ ] **Step 2: 写脚本**

```bash
#!/usr/bin/env bash
# generate-health-base.sh — 生成 / 更新 wiki/health.base 健康仪表盘
# 用法：bash generate-health-base.sh <wiki-root>
set -euo pipefail

WIKI_ROOT="${1:-.}"
OUT="$WIKI_ROOT/wiki/health.base"

[[ -d "$WIKI_ROOT/wiki" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/\"}]}"
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

count_errors() {
  local script="$1"
  local out
  out=$("$SCRIPT_DIR/$script" "$WIKI_ROOT" 2>/dev/null || true)
  if jq -e '.errors' <<< "$out" >/dev/null 2>&1; then
    jq '.errors | length' <<< "$out"
  else
    echo 0
  fi
}

total_pages=$(find "$WIKI_ROOT/wiki" -type f -name '*.md' ! -name 'health.base' | wc -l | tr -d ' ')
orphans_count=$(count_errors check-orphans.sh)
fm_errors=$(count_errors check-frontmatter.sh)
drift_count=$(count_errors check-index-drift.sh)

# 从 log.md 找最后一条 ingest
last_ingest=""
if [[ -f "$WIKI_ROOT/log.md" ]]; then
  last_ingest=$(grep -E '\| ingest \|' "$WIKI_ROOT/log.md" | tail -n1 | awk -F' \\| ' '{print $1}' || true)
fi
last_ingest="${last_ingest:-never}"

timestamp=$(date '+%Y-%m-%d %H:%M')

cat > "$OUT" <<BASE
# Auto-generated by llm-wiki-kit lint Skill. Do not edit by hand.
# Regenerate: bash skills/lint/scripts/generate-health-base.sh <wiki-root>

filters:
  and:
    - file.ext == "md"

views:
  - type: table
    name: Wiki Health
    order:
      - file.name
      - total_pages
      - orphans_count
      - frontmatter_errors_count
      - index_drift_count
      - last_ingest_at
      - updated_at

properties:
  total_pages: ${total_pages}
  orphans_count: ${orphans_count}
  frontmatter_errors_count: ${fm_errors}
  index_drift_count: ${drift_count}
  last_ingest_at: "${last_ingest}"
  updated_at: "${timestamp}"
BASE

jq -nc --arg f "$OUT" '{status:"pass", errors:[], file:$f}'
```

**注意时间戳问题：** 第二次运行会刷新 `updated_at` 字段，导致幂等性测试失败。修复方式——用环境变量允许外部固定时间戳：

把脚本的 `timestamp=...` 改为：
```bash
timestamp="${LWK_NOW:-$(date '+%Y-%m-%d %H:%M')}"
```

然后在幂等性测试里设置相同 `LWK_NOW`：

```typescript
// 第二个 it 改为：
it("is idempotent when LWK_NOW is fixed", async () => {
  const env = { ...process.env, LWK_NOW: "2026-04-20 10:00" };
  await execa("bash", [path.join(SCRIPTS, "generate-health-base.sh"), workDir], {
    env, reject: false
  });
  const a = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
  await execa("bash", [path.join(SCRIPTS, "generate-health-base.sh"), workDir], {
    env, reject: false
  });
  const b = await readFile(path.join(workDir, "wiki/health.base"), "utf8");
  expect(b).toBe(a);
});
```

- [ ] **Step 3: 赋权 + 测试 + commit**

```bash
chmod +x skills/lint/scripts/generate-health-base.sh
pnpm test tests/skills/lint.test.ts
```

```bash
git add skills/lint/scripts/generate-health-base.sh tests/skills/lint.test.ts
git commit -m "feat(skill/lint): add generate-health-base.sh"
```

### Task 7.5: `lint/SKILL.md` + example

**Files:**
- Create: `skills/lint/SKILL.md`
- Create: `skills/lint/examples/lint-session.md`

- [ ] **Step 1: 写 `SKILL.md`**

```markdown
---
name: lint
description: Use periodically (weekly / before release) to run full-wiki health check, surface orphans and drift, and regenerate the wiki/health.base dashboard.
---

# lint Skill

## 何时使用

- 每周或每次集中 ingest 后
- 发布前的"wiki 体检"
- wiki 规模变大后做整理

## 前置准备

同 ingest Skill。wiki 存在且有内容。

## 工作流

### Step 1 — 全量扫描

按顺序运行四个检查脚本（都是 JSON 输出）：

```bash
bash scripts/check-frontmatter.sh <wiki-root>
bash scripts/check-index-drift.sh <wiki-root>
bash scripts/check-orphans.sh <wiki-root>
```

汇总所有 errors 为一张清单。

### Step 2 — 分类并向用户汇报

按优先级列出：
- **必修（frontmatter 错误）**：可能导致 ingest/query 失败
- **建议修（index drift）**：索引偏移
- **可选修（orphans）**：孤立页面，可能表示遗忘的 stub 或需要整合

对每条提供"建议动作"：
- missing-required-field → "补全 `<field>`"
- broken-link → "修正目标页名 或 创建 stub 页"
- orphan → "考虑并入相关 concept/domain 或标记 `status: archived`"

### Step 3 — 与用户对话修复

按用户同意的条目逐项修复。每修一类跑对应校验脚本确认绿。

### Step 4 — 更新 health.base

```bash
bash scripts/generate-health-base.sh <wiki-root>
```

生成 / 更新 `wiki/health.base`（Obsidian Bases 格式仪表盘）。

### Step 5 — log.md 追加

```
YYYY-MM-DD HH:MM | lint | full-scan | fixed: <N frontmatter> / <N drift> / <N orphan>
```

## 输出约束

- 不静默修复——每条都必须用户确认
- health.base 每次必须重新生成（不能手改）

## 校验脚本

- `scripts/check-frontmatter.sh <wiki-root>`
- `scripts/check-index-drift.sh <wiki-root>`
- `scripts/check-orphans.sh <wiki-root>`
- `scripts/generate-health-base.sh <wiki-root>`

## 示例

- `examples/lint-session.md`
```

- [ ] **Step 2: 写 `examples/lint-session.md`**

```markdown
# 示例：lint 会话

## User
跑一下 lint。

## LLM（Step 1）
运行三个校验脚本：

- frontmatter: 2 errors（`wiki/concepts/TCP.md` 缺 tags、`wiki/summaries/旧笔记.md` 缺 sources）
- index-drift: 1 error（index 缺 `[[TCP]]`）
- orphans: 3 pages（`wiki/entities/同事A.md`、`wiki/concepts/遗忘术语.md`、`wiki/playbooks/半成品.md`）

## LLM（Step 2）
报告：

**必修（2 条）**
- `TCP.md`: 建议添加 `tags: [network, protocol]`
- `旧笔记.md`: 建议填 `sources: [raw/旧资料.md]`

**建议修（1 条）**
- `index.md` 缺 `[[TCP]]` → 建议添加到 Concepts 分节

**可选修（3 条）**
- `同事A.md` — 可能已离职，建议标 `status: archived`
- `遗忘术语.md` — 内容为 stub，建议并入相关 concept 或删除
- `半成品.md` — playbook 草稿，建议完成或删除

要我全部修复吗？

## User
必修和建议修都做，孤儿先放着。

## LLM（Step 3-5）
- 改 TCP.md 添加 tags → check-frontmatter pass
- 改 旧笔记.md 添加 sources → check-frontmatter pass
- 追加 `[[TCP]]` 到 index.md → check-index-drift pass
- 运行 generate-health-base.sh → 生成 `wiki/health.base`
- log.md 追加：`2026-04-20 22:00 | lint | full-scan | fixed: 2 fm / 1 drift`

完成。health.base 显示：total=42 / orphans=3 / fm=0 / drift=0。
```

- [ ] **Step 3: Commit**

```bash
git add skills/lint/SKILL.md skills/lint/examples
git commit -m "feat(skill/lint): add SKILL.md workflow and session example"
```

---

## Phase 8 — 文档 + Release 准备

### Task 8.1: 根 `README.md`

**Files:**
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: 写 `LICENSE`（MIT）**

```
MIT License

Copyright (c) 2026 <OWNER>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: 写 `README.md`**

```markdown
# llm-wiki-kit

> 帮助任何人快速搭建和维护 LLM Wiki 的工具包。
> CLI 处理确定性操作，Skill 包处理需要 LLM 判断的工作流。

## 核心理念

LLM Wiki（基于 [llm-wiki 模式](https://github.com/tobi/llm-wiki)）是一种让 LLM 增量构建和维护个人知识库的方法。本工具包解决从零搭建 LLM Wiki 的三个痛点：

1. **文档格式杂乱** → CLI `convert` 批量转换为 Markdown
2. **骨架和 schema 手动创建** → CLI `init` + `schema-wizard` Skill
3. **LLM 输出质量不稳定** → Skill 包的三层 harness（提示词 + 校验脚本 + 示例）

## 安装

### 先装外部依赖

```bash
brew install pandoc jq   # macOS
# 或 apt-get install pandoc jq
```

### 使用 CLI

```bash
npx llm-wiki-kit init
npx llm-wiki-kit convert -i ~/Downloads/docs -o ./raw
```

## 架构

- `packages/cli/` — TypeScript CLI 包（`init` + `convert`）
- `skills/` — 4 个完全自包含的 Skill 包
  - `schema-wizard/` — 引导生成定制 schema
  - `ingest/` — 把 raw 文档整理进 wiki
  - `query/` — 回答问题并回填新知识
  - `lint/` — 全量健康检查 + health.base 仪表盘

每个 Skill 目录可以独立拷贝到任何 LLM 客户端的 skills 目录使用。

## 文档

- [Getting Started](docs/getting-started.md)
- [Harness 设计理念](docs/harness-design.md)

## 贡献与路线图

v1 不做：PDF 转换、Obsidian canvas/marp/bases 深度集成、MCP Server。
v2 计划：Marker/Docling 集成 PDF、search Skill（qmd）、主流客户端适配层。

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: add README and MIT license"
```

### Task 8.2: `docs/getting-started.md`

**Files:**
- Create: `docs/getting-started.md`

- [ ] **Step 1: 写文档**

```markdown
# Getting Started

> 目标：10 分钟内从零到完成第一次 ingest。

## 1. 安装外部依赖

```bash
brew install pandoc jq   # macOS，其他平台见 README
```

## 2. 初始化 wiki

```bash
npx llm-wiki-kit init
```

交互回答：知识库名称、存放路径、skills 安装位置。完成后你会有：

```
my-wiki/
├── raw/                         # 放原始素材
├── wiki/{domains,entities,concepts,playbooks,summaries}/
├── index.md log.md MOC.md
├── CLAUDE.md AGENTS.md COPILOT.md
└── .llm-wiki-kit/skills/{schema-wizard,ingest,query,lint}/
```

## 3. 转换你的历史文档

```bash
npx llm-wiki-kit convert -i ~/Documents/notes -o ./raw
```

`.pdf` 文件会被跳过（v2 支持）。其他（docx/html/epub/pptx）全部转为 md，图片路径规范化。

## 4. （可选）定制 schema

用 Claude Code / Codex 等客户端打开 wiki 目录，让 LLM 加载 `skills/schema-wizard/SKILL.md`，回答访谈问题，生成定制化 `CLAUDE.md`。

## 5. 第一次 ingest

让 LLM 加载 `skills/ingest/SKILL.md`，然后：

```
ingest raw/<任意一个文档>.md
```

LLM 会走完 7 步工作流，3 个校验脚本兜底。

## 6. 查询 + 回填

```
wiki 里关于 X 的内容总结一下
```

LLM 加载 `skills/query/SKILL.md`，回答后会问是否回填新补充的内容。

## 7. 定期 lint

每周：

```
跑一下 lint
```

LLM 加载 `skills/lint/SKILL.md`，运行 4 个检查脚本并更新 `wiki/health.base`。

## 问题排查

- **脚本报错 `jq: command not found`** → `brew install jq`
- **convert 报 Pandoc 未安装** → 按 CLI 输出的链接安装
- **校验脚本一直 fail** → 把 JSON 输出贴给 LLM 看，多数情况它能自修
```

- [ ] **Step 2: Commit**

```bash
git add docs/getting-started.md
git commit -m "docs: add getting-started guide"
```

### Task 8.3: `docs/harness-design.md`

**Files:**
- Create: `docs/harness-design.md`

- [ ] **Step 1: 写文档**

```markdown
# Harness 设计理念

> 为什么本项目的核心不是 CLI，而是 Skill 包的三层 harness。

## 问题

LLM 生成 wiki 页面时会稳定地出现这类错误：

- frontmatter 漏字段、值类型错、拼错字段名
- 链接指向不存在的页面
- index.md 忘记更新
- 新建页成为孤岛

单纯依赖更好的 prompt 不能彻底解决——任何非确定性输出都可能漂移。

## 方案：三层 Harness

```
┌─────────────────────────────────┐
│  SKILL.md（提示词层）            │  ← 定义工作流、硬约束
├─────────────────────────────────┤
│  scripts/（校验层）              │  ← 确定性检查，JSON 反馈
├─────────────────────────────────┤
│  examples/（示范层）             │  ← few-shot 锚定输出风格
└─────────────────────────────────┘
```

每层缺一不可：
- 没提示词 → LLM 不知道要做什么
- 没校验 → 错误会沉默地累积
- 没示例 → 输出质量漂移

## 校验脚本设计原则

### 1. 单一职责
每个 `.sh` 只检查一件事：frontmatter 是 frontmatter，链接是链接，不混着。这样报错明确，LLM 修复指向清楚。

### 2. JSON 输出
统一格式：

```json
{
  "status": "pass" | "fail",
  "errors": [
    { "file": "...", "rule": "...", "message": "..." }
  ]
}
```

`rule` 是机器友好的 ID，LLM 可以基于它查到修复策略。`message` 给人看。

### 3. 修复循环上限
SKILL.md 规定最多重试 2 次。超过就把 JSON 抛给用户，不让 LLM 陷入死循环。

### 4. 独立可运行
用户可以手动跑脚本做批量检查，不必进入 LLM 会话。这让 harness 成为工具，而不是黑盒。

## Skill 之间的协作

- `schema-wizard` 产出的 schema 是其他三个 Skill 的规则来源
- `lint` 的脚本是 `ingest` 校验的**全量超集**——ingest 只校验被改动的页，lint 扫全库
- **每个 Skill 完全自包含**：通用工具函数内联到各自脚本，允许少量代码重复换取独立拷贝安装

## 本地模型兼容

Skill 提示词不依赖 tool use 或特定模型能力——纯文本指令 + 脚本兜底。即使小模型写出糟糕的 frontmatter，`validate-frontmatter.sh` 仍然能捕获并要求修复。

## 反面教材

本项目**不做**：
- LLM-as-judge 质量评估（v1 不值得复杂度）
- 依赖特定 LLM 客户端的 tool calling
- 把校验逻辑内嵌到 TypeScript（脚本版任何客户端都能跑）

## 参考

- [ai-daily-news Skill](https://github.com/<OWNER>/ai-daily-news) — 本项目的精神前身
- [Anthropic Agent SDK guidance](https://docs.anthropic.com/) — tool use 模式
```

- [ ] **Step 2: Commit**

```bash
git add docs/harness-design.md
git commit -m "docs: add harness design rationale"
```

### Task 8.4: CLI 构建 + 发布前检查

**Files:**
- Modify: `packages/cli/package.json`（如需 files/exports 调整）

- [ ] **Step 1: 本地 build**

```bash
pnpm --filter llm-wiki-kit build
```

Expected: `packages/cli/dist/` 生成 index.js + index.cjs + index.d.ts。

- [ ] **Step 2: 测试 packed tarball**

```bash
cd packages/cli
pnpm pack
```

Expected: 生成 `llm-wiki-kit-0.1.0.tgz`。解压确认 `templates/`、`bin/`、`dist/` 都在。

```bash
tar tzf llm-wiki-kit-0.1.0.tgz | head -50
```

- [ ] **Step 3: 本地 global 安装冒烟**

```bash
npm i -g ./llm-wiki-kit-0.1.0.tgz
rm -rf /tmp/final-smoke
llm-wiki-kit init --yes --path /tmp/final-smoke --name "Final"
ls /tmp/final-smoke
llm-wiki-kit --version
```

Expected: 无错误，骨架完整。

**注意：** 打包的 skills/ 位置——当前 `packages/cli/package.json` 的 `files` 只包含 `bin/dist/templates`。需要决定 skills 打包策略：

选项 A（推荐）：build 前用一个 prepack 脚本把 `../../skills/` 拷贝到 `packages/cli/skills/` 并加进 `files`。
选项 B：用户另行从 repo 拉取 skills（不推荐）。

采用方案 A：

- [ ] **Step 4: 添加 prepack 脚本**

修改 `packages/cli/package.json`：

```json
{
  "scripts": {
    "prepack": "rm -rf skills && cp -R ../../skills ./skills",
    "build": "tsup"
  },
  "files": [
    "bin",
    "dist",
    "templates",
    "skills",
    "README.md"
  ]
}
```

- [ ] **Step 5: 回归测试 — skills-installer 找得到打包后的 skills**

skills-installer 的 `resolveSkillsSource` 已覆盖 `../skills` 候选路径。重新跑 init.test 确认。

```bash
cd ../..
pnpm -C packages/cli prepack
pnpm test tests/cli/init.test.ts
```

Expected: 依然 PASS。

- [ ] **Step 6: Commit**

```bash
git add packages/cli/package.json
git commit -m "chore(cli): copy skills/ into package before publish"
```

### Task 8.5: CI 配置（可选但推荐）

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 写 CI**

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: sudo apt-get install -y pandoc jq
      - run: pnpm install
      - run: pnpm -r typecheck
      - run: pnpm -r build
      - run: pnpm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
```

### Task 8.6: 最终端到端冒烟测试

- [ ] **Step 1: 清空临时目录**

```bash
rm -rf /tmp/e2e-wiki
```

- [ ] **Step 2: init**

```bash
pnpm --filter llm-wiki-kit dev -- init --yes --path /tmp/e2e-wiki --name "E2E Wiki"
```

Expected: 生成全部文件和 skills/。

- [ ] **Step 3: 手工 ingest 一个文档（脚本级跑通，不涉及真 LLM）**

```bash
cp tests/fixtures/wiki/wiki/summaries/dns-basics.md /tmp/e2e-wiki/wiki/summaries/
cp tests/fixtures/wiki/wiki/domains/网络.md /tmp/e2e-wiki/wiki/domains/
cp tests/fixtures/wiki/wiki/concepts/递归解析.md /tmp/e2e-wiki/wiki/concepts/

cat >> /tmp/e2e-wiki/index.md <<'EOF'
- [[DNS 基础]]
- [[网络]]
- [[递归解析]]
EOF

bash /tmp/e2e-wiki/.llm-wiki-kit/skills/ingest/scripts/validate-frontmatter.sh /tmp/e2e-wiki
bash /tmp/e2e-wiki/.llm-wiki-kit/skills/ingest/scripts/validate-links.sh /tmp/e2e-wiki
bash /tmp/e2e-wiki/.llm-wiki-kit/skills/ingest/scripts/validate-index-sync.sh /tmp/e2e-wiki
```

Expected: 三个脚本都输出 `{"status":"pass","errors":[]}`。

- [ ] **Step 4: lint**

```bash
bash /tmp/e2e-wiki/.llm-wiki-kit/skills/lint/scripts/check-frontmatter.sh /tmp/e2e-wiki
bash /tmp/e2e-wiki/.llm-wiki-kit/skills/lint/scripts/check-orphans.sh /tmp/e2e-wiki
bash /tmp/e2e-wiki/.llm-wiki-kit/skills/lint/scripts/check-index-drift.sh /tmp/e2e-wiki
bash /tmp/e2e-wiki/.llm-wiki-kit/skills/lint/scripts/generate-health-base.sh /tmp/e2e-wiki
cat /tmp/e2e-wiki/wiki/health.base
```

Expected: lint 三脚本 pass，health.base 生成并显示 `total_pages: 3` 等。

- [ ] **Step 5: Commit（若前面有 e2e 相关调整）**

```bash
git status
# 若无改动，结束。若有，commit 之。
```

---

## 附录 A — 依赖与版本锁定

所有运行时依赖：
- Node.js ≥ 20（package.json engines 字段声明）
- pnpm 9.x
- pandoc（外部，检测 + 报错提示）
- jq（外部，所有 bash 脚本用）
- bash 4+（macOS 默认 3.x，用户需装新版或已默认用 5.x via brew）

所有 `package.json` 里的 npm 依赖版本：
- commander: ^12.1.0
- @clack/prompts: ^0.7.0
- execa: ^9.5.0
- tsup: ^8.3.0
- tsx: ^4.19.0
- typescript: ^5.6.0
- vitest: ^2.1.0

---

## 附录 B — 测试覆盖矩阵

| 组件 | 测试文件 | 断言数 |
|---|---|---|
| CLI smoke | tests/cli/smoke.test.ts | 2 |
| CLI templates | tests/cli/templates.test.ts | 3 |
| CLI pandoc | tests/cli/pandoc.test.ts | 1 |
| CLI post-process | tests/cli/post-process.test.ts | 4 |
| CLI init | tests/cli/init.test.ts | 4 |
| CLI convert | tests/cli/convert.test.ts | 3 |
| schema-wizard | tests/skills/schema-wizard.test.ts | 3 |
| ingest（3 脚本） | tests/skills/ingest.test.ts | 6 |
| query | tests/skills/query.test.ts | 3 |
| lint（4 脚本） | tests/skills/lint.test.ts | 8 |
| **总计** | | **~37** |

覆盖率目标（vitest coverage）：TS 核心逻辑 ≥ 80%。Bash 脚本覆盖由上表集成测试保证（每个分支至少 1 pass + 1 fail）。
