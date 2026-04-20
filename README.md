# llm-wiki-kit

> 一套让 LLM 稳定搭建和维护个人知识库的工具包。
> CLI 处理确定性操作，Skill 包用 harness 约束 LLM 的非确定性输出。

[![CI](https://github.com/JexZhang/llm-wiki-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/JexZhang/llm-wiki-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

English version: [README-en.md](./README-en.md)

---

## 这是什么？

[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 是 Andrej Karpathy 提出的一种思路：用 Obsidian 格式的 Markdown 文件 + 双向链接，让 LLM 作为知识的摄入/整理/查询入口，增量构建个人知识库。

这套模式很强，但从零落地有三个痛点：

| 痛点 | 解决方案 |
| --- | --- |
| 历史文档格式杂乱（docx/html/epub/pptx） | **CLI `convert`** 批量转 Markdown |
| 目录结构、schema、多客户端指令文件要手动搓 | **CLI `init`** 一键生成骨架 + 多客户端适配文件 |
| LLM 输出 frontmatter 缺字段、链接断裂、索引错位 | **Skill 包** — 提示词 + 校验脚本 + few-shot 示例 |

**核心理念：Harness Engineering** — 用确定性的 bash 脚本兜底非确定性的 LLM 输出。每个 Skill 的校验脚本输出机器可读 JSON，LLM 自读自修，最多重试 2 次。

## 特性

- 📦 **零配置初始化** — `npx llm-wiki-kit init` 10 秒内完成 wiki 骨架
- 🔄 **批量文档转换** — 基于 Pandoc，支持 docx/html/epub/pptx，保留中文文件名
- 🛡️ **LLM 输出 harness** — 4 个 Skill 包含 9 个 bash 校验脚本
- 🔌 **多客户端兼容** — 同时生成 CLAUDE.md / AGENTS.md / COPILOT.md，适配 Claude Code、Cursor、Codex、Copilot CLI
- 📂 **Skill 完全自包含** — 任意一个 skill 目录都可独立复制到 `~/.claude/skills/` 等位置使用

## 快速开始

### 1. 安装外部依赖

```bash
# macOS
brew install pandoc jq

# Ubuntu/Debian
sudo apt-get install pandoc jq
```

### 2. 初始化 wiki

```bash
npx llm-wiki-kit init
```

交互式回答三个问题后，生成如下结构：

```
my-wiki/
├── raw/                           # 原始素材放这里
├── wiki/
│   ├── domains/                   # 领域首页
│   ├── entities/                  # 实体页（人、产品、组织）
│   ├── concepts/                  # 概念页（术语、理论）
│   ├── playbooks/                 # 操作手册
│   └── summaries/                 # 文档摘要页
├── index.md                       # 全站索引
├── log.md                         # 变更日志
├── MOC.md                         # Map of Content
├── CLAUDE.md AGENTS.md COPILOT.md # 多客户端 schema
└── .llm-wiki-kit/skills/          # 4 个 Skill 包
```

### 3. 转换历史文档

```bash
npx llm-wiki-kit convert -i ~/Downloads/notes -o ./raw
```

`.pdf` 暂不支持（v2 计划），其他格式自动清洗：修复图片路径、去多余空行、统一换行符。

### 4. 让 LLM 开始 ingest

用 Claude Code / Codex 等客户端打开 wiki 目录：

```
ingest raw/DNS基础学习.md
```

LLM 会读取 `skills/ingest/SKILL.md`，按 7 步工作流执行，每步后运行校验脚本。

完整流程见 [Getting Started](./docs/getting-started.md)。

## 工作原理

每个 Skill 是**三层 harness**：

```
提示词层（SKILL.md）     定义工作流、约束、校验触发点
      ↓
校验层（scripts/*.sh）   确定性检查，JSON 输出，LLM 自修
      ↓
示范层（examples/）      few-shot 好/坏对比样本
```

### 校验脚本清单（9 个）

| Skill | 脚本 | 检查内容 |
| --- | --- | --- |
| schema-wizard | `validate-schema.sh` | schema 格式、必要字段完整性 |
| ingest | `validate-frontmatter.sh` | frontmatter 必填字段、类型值合法性 |
| ingest | `validate-links.sh` | wiki link 目标存在、双向链接完整 |
| ingest | `validate-index-sync.sh` | `index.md` 与实际文件一致 |
| query | `validate-backfill.sh` | 回填页的 frontmatter 和链接 |
| lint | `check-orphans.sh` | 无入站链接的孤儿页 |
| lint | `check-frontmatter.sh` | 全量 frontmatter 合规检查 |
| lint | `check-index-drift.sh` | `index.md` 与实际文件偏移 |
| lint | `generate-health-base.sh` | 生成/更新 `wiki/health.base` 仪表盘 |

所有脚本输出统一格式：

```json
{
  "status": "fail",
  "errors": [
    {
      "file": "wiki/summaries/DNS基础学习.summary.md",
      "rule": "frontmatter-required-fields",
      "message": "缺少 'sources' 字段"
    }
  ]
}
```

LLM 可直接解析并定位修复。

## 项目结构

```
llm-wiki-kit/
├── packages/cli/          # npm 包：llm-wiki-kit (init + convert)
├── skills/                # 4 个 Skill 包（每个完全自包含）
│   ├── schema-wizard/     # 引导生成定制化 schema
│   ├── ingest/            # raw → wiki 摄入工作流
│   ├── query/             # 查询 + 回填工作流
│   └── lint/              # 全量健康检查 + 仪表盘
├── tests/                 # 集成测试（cli + skills）
├── docs/
│   ├── getting-started.md # 10 分钟上手指南
│   └── harness-design.md  # harness 设计理念
└── .github/workflows/     # CI 配置
```

## 支持的 LLM 客户端

- **Claude Code / Cursor** — 通过 `CLAUDE.md` 自动加载
- **Codex** — 通过 `AGENTS.md` 自动加载
- **GitHub Copilot CLI** — 通过 `COPILOT.md` 加载
- **其他客户端（aider / 本地模型等）** — 把 `SKILL.md` 内容粘进 system prompt 即可，校验脚本独立于任何客户端运行

## 文档

- [Getting Started](./docs/getting-started.md) — 从零到第一次 ingest
- [Harness 设计理念](./docs/harness-design.md) — 为什么用 bash 校验脚本而不是 LLM 自检

## 开发

```bash
pnpm install
pnpm -r build
pnpm exec vitest run       # 37 测试
pnpm -r typecheck
```

## 路线图

**v1（当前）**
- ✅ CLI `init` + `convert`
- ✅ 4 个 Skill 包 + 9 个校验脚本
- ✅ 多客户端适配

**v2 计划**
- PDF 转换（集成 Marker / Docling）
- Obsidian 原生集成（canvas / marp / bases 生成）
- search Skill（集成 qmd 做全文检索）
- LLM-as-judge 自动质量评估

**不做**
- MCP Server（不必要的复杂度）
- Web UI（和命令行定位不符）
- 特定客户端深度绑定

## 贡献

欢迎 Issue / PR。优先方向：

- 新的 Skill 包（如写作 / 笔记同步 / 课程学习工作流）
- 校验脚本的 Windows 兼容性（目前测试过 macOS / Linux）
- 非中英文 wiki 的 frontmatter 约定

## License

[MIT](./LICENSE)

## 致谢

- [LLM Wiki (Karpathy)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 启发了整个项目的知识库范式
