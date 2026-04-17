// tests/cli/post-process.test.ts
import { describe, it, expect } from "vitest";
import { postProcess } from "../../packages/cli/src/lib/post-process.js";

describe("postProcess", () => {
  it("collapses 3+ blank lines into max 2", () => {
    const input = "A\n\n\n\nB";
    expect(postProcess(input)).toBe("A\n\nB");
  });

  it("normalises CRLF to LF", () => {
    expect(postProcess("A\r\nB")).toBe("A\nB");
  });

  it("rewrites media/ image paths to assets/", () => {
    const input = "![x](media/image1.png)";
    expect(postProcess(input)).toBe("![x](assets/image1.png)");
  });

  it("leaves absolute http(s) urls alone", () => {
    const url = "![x](https://example.com/a.png)";
    expect(postProcess(url)).toBe(url);
  });
});
