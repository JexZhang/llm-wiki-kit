# 示例：lint 会话

> 场景：用户让 LLM 跑一次完整的 wiki 健康检查。

## User
跑一下 lint。

## LLM（Step 1）
运行三个校验脚本：

- frontmatter: 2 errors（`wiki/concepts/TCP.md` 缺 tags、`wiki/summaries/旧笔记.md` 缺 sources）
- index-drift: 1 error（index 缺 `[[TCP]]`）
- orphans: 3 pages（`wiki/entities/同事 A.md`、`wiki/concepts/遗忘术语.md`、`wiki/playbooks/半成品.md`）

## LLM（Step 2）
报告：

**必修（2 条）**
- `TCP.md`: 建议添加 `tags: [network, protocol]`
- `旧笔记.md`: 建议填 `sources: [raw/旧资料.md]`

**建议修（1 条）**
- `index.md` 缺 `[[TCP]]` → 建议添加到 Concepts 分节

**可选修（3 条）**
- `同事 A.md` — 可能已离职，建议标 `status: archived`
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
