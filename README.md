# llm-wiki-kit

> 帮助任何人快速搭建和维护 LLM Wiki 的工具包。
> CLI 处理确定性操作，Skill 包处理需要 LLM 判断的工作流。

## 核心理念

LLM Wiki（基于 [llm-wiki 模式](https://github.com/tobi/llm-wiki)）是一种让 LLM 增量构建和维护个人知识库的方法。本工具包解决从零搭建 LLM Wiki 的三个痛点：

1. **文档格式杂乱** → CLI `convert` 批量转换为 Markdown
2. **骨架和 schema 手动创建** → CLI `init` + `schema-wizard` Skill
3. **LLM 输出质量不稳定** → Skill 包的三层 harness（提示词 + 校验脚本 + 示例）

## 安装

### 先装外部依赖

```bash
brew install pandoc jq   # macOS
# 或 apt-get install pandoc jq
```

### 使用 CLI

```bash
npx llm-wiki-kit init
npx llm-wiki-kit convert -i ~/Downloads/docs -o ./raw
```

## 架构

- `packages/cli/` — TypeScript CLI 包（`init` + `convert`）
- `skills/` — 4 个完全自包含的 Skill 包
  - `schema-wizard/` — 引导生成定制 schema
  - `ingest/` — 把 raw 文档整理进 wiki
  - `query/` — 回答问题并回填新知识
  - `lint/` — 全量健康检查 + health.base 仪表盘

每个 Skill 目录可以独立拷贝到任何 LLM 客户端的 skills 目录使用。

## 文档

- [Getting Started](docs/getting-started.md)
- [Harness 设计理念](docs/harness-design.md)

## 贡献与路线图

v1 不做：PDF 转换、Obsidian canvas/marp/bases 深度集成、MCP Server。
v2 计划：Marker/Docling 集成 PDF、search Skill（qmd）、主流客户端适配层。

## License

MIT
