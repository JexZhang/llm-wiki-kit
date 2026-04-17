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
