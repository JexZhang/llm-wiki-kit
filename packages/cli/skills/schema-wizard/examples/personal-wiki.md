# 示例：个人知识库定制 schema

> 假设用户场景：程序员 + 读书爱好者 + 偶尔做职业规划

## 访谈结论

- 领域：`计算机 `、` 阅读笔记 `、` 职业规划`
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
