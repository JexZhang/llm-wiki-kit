import { describe, it, expect } from "vitest";
import { renderTemplate } from "../../packages/cli/src/lib/templates.js";

describe("renderTemplate", () => {
  it("replaces {{VAR}} with provided values", () => {
    const out = renderTemplate("Hello {{NAME}}!", { NAME: "World" });
    expect(out).toBe("Hello World!");
  });

  it("replaces multiple occurrences", () => {
    const out = renderTemplate("{{A}} and {{A}} and {{B}}", { A: "x", B: "y" });
    expect(out).toBe("x and x and y");
  });

  it("leaves unknown vars untouched", () => {
    const out = renderTemplate("{{UNKNOWN}}", {});
    expect(out).toBe("{{UNKNOWN}}");
  });
});
