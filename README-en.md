# llm-wiki-kit

> A toolkit for building and maintaining LLM-powered personal wikis in minutes.
> CLI handles deterministic operations; Skill packages handle LLM-driven workflows with built-in validation.

## Core Philosophy

LLM Wiki (based on the [llm-wiki pattern](https://github.com/tobi/llm-wiki)) is a methodology for LLMs to incrementally build and maintain personal knowledge bases. This toolkit addresses three pain points when setting up an LLM Wiki from scratch:

1. **Messy document formats** → CLI `convert` batch-converts to Markdown via pandoc
2. **Manual skeleton and schema creation** → CLI `init` + `schema-wizard` Skill
3. **Unstable LLM output quality** → Three-layer harness for Skill packages (prompt + validation scripts + examples)

## Installation

### Install External Dependencies First

```bash
brew install pandoc jq   # macOS
# or apt-get install pandoc jq
```

### Using the CLI

```bash
npx llm-wiki-kit init
npx llm-wiki-kit convert -i ~/Downloads/docs -o ./raw
```

## Architecture

- `packages/cli/` — TypeScript CLI package (`init` + `convert` commands)
- `skills/` — 4 fully self-contained Skill packages
  - `schema-wizard/` — Interactive wizard for customizing wiki schema
  - `ingest/` — Organize raw documents into the wiki structure
  - `query/` — Answer questions and backfill new knowledge
  - `lint/` — Full health check + health.base dashboard

Each Skill directory can be independently copied to any LLM client's skills directory for use.

## Documentation

- [Getting Started](docs/getting-started.md)
- [Harness Design Rationale](docs/harness-design.md)

## Project Description

**llm-wiki-kit** is a complete toolkit for building LLM-powered personal wikis. It combines a TypeScript CLI for scaffolding and document conversion with four self-contained Skill packages that guide LLMs through validated workflows for knowledge ingestion, querying, and maintenance.

## Contributing & Roadmap

v1 out of scope: PDF conversion, deep Obsidian canvas/marp/bases integration, MCP Server.
v2 planned: Marker/Docling integration for PDF, search Skill (qmd), mainstream client adapter layer.

## License

MIT
