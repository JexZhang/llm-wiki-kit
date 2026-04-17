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
