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
