import { describe, it, expect } from "vitest";
import { detectPandoc } from "../../packages/cli/src/lib/pandoc.js";

describe("detectPandoc", () => {
  it("returns version string when pandoc is available", async () => {
    const result = await detectPandoc();
    if (result.installed) {
      expect(result.version).toMatch(/^\d+\.\d+/);
    } else {
      expect(result.hint).toMatch(/install/i);
    }
  });
});
