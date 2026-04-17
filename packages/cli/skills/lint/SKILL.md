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
