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
