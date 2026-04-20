# llm-wiki-kit

> A toolkit for LLMs to reliably build and maintain personal knowledge bases.
> CLI handles deterministic work; Skill packages use a harness to constrain non-deterministic LLM output.

[![CI](https://github.com/JexZhang/llm-wiki-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/JexZhang/llm-wiki-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

中文版: [README.md](./README.md)

---

## What is this?

[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) is a pattern proposed by Andrej Karpathy: use Obsidian-style Markdown files with bidirectional links, and let an LLM act as the ingest / curation / query interface to incrementally grow a personal knowledge base.

The pattern is powerful, but setting one up from scratch hits three pain points:

| Pain point | Solution |
| --- | --- |
| Legacy docs in mixed formats (docx/html/epub/pptx) | **CLI `convert`** batch-converts to Markdown |
| Hand-crafting directory layout, schema, and per-client instruction files | **CLI `init`** scaffolds skeleton + multi-client adapter files |
| LLM output drifts — missing frontmatter fields, broken links, index mismatches | **Skill packages** — prompt + validation scripts + few-shot examples |

**Core idea: Harness Engineering** — use deterministic bash scripts as a safety net under non-deterministic LLM output. Every Skill's validation script emits machine-readable JSON; the LLM reads it and self-repairs, capped at 2 retries.

## Features

- 📦 **Zero-config init** — `npx llm-wiki-kit init` builds a wiki skeleton in seconds
- 🔄 **Batch document conversion** — Pandoc-based, supports docx/html/epub/pptx, preserves non-ASCII filenames
- 🛡️ **LLM output harness** — 4 Skills containing 9 bash validation scripts
- 🔌 **Multi-client compatible** — generates CLAUDE.md / AGENTS.md / COPILOT.md side-by-side for Claude Code, Cursor, Codex, Copilot CLI
- 📂 **Skills fully self-contained** — any skill folder can be copied standalone to `~/.claude/skills/` or equivalent
- 🧪 **37 tests** — CLI and every validation script covered by integration tests

## Quick Start

### 1. Install external dependencies

```bash
# macOS
brew install pandoc jq

# Ubuntu/Debian
sudo apt-get install pandoc jq
```

### 2. Initialize a wiki

```bash
npx llm-wiki-kit init
```

Answer three interactive prompts. You'll get:

```
my-wiki/
├── raw/                           # Drop raw material here
├── wiki/
│   ├── domains/                   # Domain hub pages
│   ├── entities/                  # Entity pages (people, products, orgs)
│   ├── concepts/                  # Concept pages (terms, theories)
│   ├── playbooks/                 # Operational how-tos
│   └── summaries/                 # Per-document summaries
├── index.md                       # Global index
├── log.md                         # Change log
├── MOC.md                         # Map of Content
├── CLAUDE.md AGENTS.md COPILOT.md # Multi-client schema
└── .llm-wiki-kit/skills/          # 4 Skill packages
```

### 3. Convert legacy documents

```bash
npx llm-wiki-kit convert -i ~/Downloads/notes -o ./raw
```

`.pdf` is skipped (v2 target). Other formats get cleaned automatically: image paths fixed, excess blank lines removed, line endings normalized.

### 4. Kick off the first ingest

Open the wiki directory in Claude Code / Codex / any MD-aware client:

```
ingest raw/dns-basics.md
```

The LLM loads `skills/ingest/SKILL.md`, runs the 7-step workflow, and runs a validation script after each step.

Full walkthrough: [Getting Started](./docs/getting-started.md).

## How it works

Every Skill is a **three-layer harness**:

```
Prompt layer   (SKILL.md)      Defines workflow, constraints, check points
     ↓
Check layer    (scripts/*.sh)  Deterministic checks, JSON output, LLM self-repairs
     ↓
Example layer  (examples/)     Few-shot good/bad comparisons
```

### Validation scripts (9 total)

| Skill | Script | Checks |
| --- | --- | --- |
| schema-wizard | `validate-schema.sh` | Schema format and required fields |
| ingest | `validate-frontmatter.sh` | Frontmatter required fields and value types |
| ingest | `validate-links.sh` | Wiki link targets exist, bidirectional completeness |
| ingest | `validate-index-sync.sh` | `index.md` matches actual files |
| query | `validate-backfill.sh` | Backfilled page frontmatter and links |
| lint | `check-orphans.sh` | Pages with zero inbound links |
| lint | `check-frontmatter.sh` | Full-sweep frontmatter compliance |
| lint | `check-index-drift.sh` | `index.md` drift vs actual files |
| lint | `generate-health-base.sh` | Generate / refresh the `wiki/health.base` dashboard |

All scripts emit a uniform format:

```json
{
  "status": "fail",
  "errors": [
    {
      "file": "wiki/summaries/dns-basics.summary.md",
      "rule": "frontmatter-required-fields",
      "message": "Missing field 'sources'"
    }
  ]
}
```

The LLM can parse this and fix issues directly.

## Project structure

```
llm-wiki-kit/
├── packages/cli/          # npm package: llm-wiki-kit (init + convert)
├── skills/                # 4 self-contained Skill packages
│   ├── schema-wizard/     # Interactive schema customization
│   ├── ingest/            # raw → wiki ingestion workflow
│   ├── query/             # Query + backfill workflow
│   └── lint/              # Full health check + dashboard
├── tests/                 # Integration tests (cli + skills)
├── docs/
│   ├── getting-started.md # 10-minute onboarding
│   └── harness-design.md  # Why bash checks, not LLM self-review
└── .github/workflows/     # CI config
```

## Supported LLM clients

- **Claude Code / Cursor** — auto-loads `CLAUDE.md`
- **Codex** — auto-loads `AGENTS.md`
- **GitHub Copilot CLI** — loads `COPILOT.md`
- **Other clients (aider, local models, etc.)** — paste `SKILL.md` content into the system prompt; validation scripts run independently of any client

## Documentation

- [Getting Started](./docs/getting-started.md) — Zero to first ingest
- [Harness Design](./docs/harness-design.md) — Why bash validation beats LLM self-review

## Development

```bash
pnpm install
pnpm -r build
pnpm exec vitest run       # 37 tests
pnpm -r typecheck
```

## Roadmap

**v1 (current)**
- ✅ CLI `init` + `convert`
- ✅ 4 Skill packages + 9 validation scripts
- ✅ Multi-client adapters

**v2 plans**
- PDF conversion (integrate Marker / Docling)
- Native Obsidian integration (canvas / marp / bases generation)
- search Skill (integrate qmd for full-text search)
- LLM-as-judge quality evaluation

**Non-goals**
- MCP Server (unnecessary complexity)
- Web UI (doesn't match the CLI positioning)
- Deep coupling to any single LLM client

## Contributing

Issues and PRs welcome. Priority areas:

- New Skill packages (writing / note-sync / course-study workflows, etc.)
- Windows compatibility for validation scripts (currently tested on macOS / Linux)
- Frontmatter conventions for non-Chinese/English wikis

## License

[MIT](./LICENSE)

## Acknowledgements

- [LLM Wiki (Karpathy)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — inspired the entire knowledge-base paradigm
- [Anthropic Skills](https://www.anthropic.com/news/agent-skills) — reference for Skill package design
- [Obsidian](https://obsidian.md) — wiki file format foundation
