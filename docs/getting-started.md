# Getting Started

> 目标：10 分钟内从零到完成第一次 ingest。

## 1. 安装外部依赖

```bash
brew install pandoc jq   # macOS，其他平台见 README
```

## 2. 初始化 wiki

```bash
npx llm-wiki-kit init
```

交互回答：知识库名称、存放路径、skills 安装位置。完成后你会有：

```
my-wiki/
├── raw/                         # 放原始素材
├── wiki/{domains,entities,concepts,playbooks,summaries}/
├── index.md log.md MOC.md
├── CLAUDE.md AGENTS.md COPILOT.md
└── .llm-wiki-kit/skills/{schema-wizard,ingest,query,lint}/
```

## 3. 转换你的历史文档

```bash
npx llm-wiki-kit convert -i ~/Documents/notes -o ./raw
```

`.pdf` 文件会被跳过（v2 支持）。其他（docx/html/epub/pptx）全部转为 md，图片路径规范化。

## 4. （可选）定制 schema

用 Claude Code / Codex 等客户端打开 wiki 目录，让 LLM 加载 `skills/schema-wizard/SKILL.md`，回答访谈问题，生成定制化 `CLAUDE.md`。

## 5. 第一次 ingest

让 LLM 加载 `skills/ingest/SKILL.md`，然后：

```
ingest raw/<任意一个文档>.md
```

LLM 会走完 7 步工作流，3 个校验脚本兜底。

## 6. 查询 + 回填

```
wiki 里关于 X 的内容总结一下
```

LLM 加载 `skills/query/SKILL.md`，回答后会问是否回填新补充的内容。

## 7. 定期 lint

每周：

```
跑一下 lint
```

LLM 加载 `skills/lint/SKILL.md`，运行 4 个检查脚本并更新 `wiki/health.base`。

## 问题排查

- **脚本报错 `jq: command not found`** → `brew install jq`
- **convert 报 Pandoc 未安装** → 按 CLI 输出的链接安装
- **校验脚本一直 fail** → 把 JSON 输出贴给 LLM 看，多数情况它能自修
