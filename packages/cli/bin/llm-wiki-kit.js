#!/usr/bin/env node
// Production entry. Requires `pnpm --filter llm-wiki-kit build` to generate dist/.
// For local development use `pnpm dev` or `pnpm tsx packages/cli/src/index.ts`.
import("../dist/index.js");
