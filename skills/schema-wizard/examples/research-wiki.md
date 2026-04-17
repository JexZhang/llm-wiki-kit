# 示例：研究者定制 schema

> 假设用户场景：在读研究生，做 LLM + RAG 方向

## 访谈结论

- 领域：`LLM`、`RAG`、` 评估方法`、` 行业动态`
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
