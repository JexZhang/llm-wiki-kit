# My Wiki — LLM Wiki Schema

## 目录约定

| 目录 | 用途 |
|---|---|
| `raw/` | 原始素材 |
| `wiki/domains/` | 领域总览 |
| `wiki/entities/` | 具体事物 |
| `wiki/concepts/` | 抽象概念 |
| `wiki/playbooks/` | 操作手册 |
| `wiki/summaries/` | 总结页 |

## Frontmatter 规范

所有 wiki 下的 Markdown 文件必须有 YAML frontmatter。

## 链接规范

使用 Obsidian 风格双向链接：`[[页面名]]`。

## 工作流

本 wiki 支持三个工作流：ingest / query / lint。
