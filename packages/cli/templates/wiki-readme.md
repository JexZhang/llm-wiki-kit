# {{WIKI_NAME}}

基于 [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)（Karpathy 提出）模式的个人知识库。由 [llm-wiki-kit](https://github.com/<OWNER>/llm-wiki-kit) 初始化。

## 快速开始

1. 把原始素材放进 `raw/`
2. 让 LLM 加载 `skills/ingest/SKILL.md`，运行 ingest 工作流
3. 提问时让 LLM 加载 `skills/query/SKILL.md`
4. 定期运行 `skills/lint/SKILL.md` 做健康检查

## schema

见 `CLAUDE.md` / `AGENTS.md` / `COPILOT.md`（内容相同，给不同客户端读）。
