import { describe, expect, test } from "bun:test";
import { ensureDefaultModelOption } from "../src/ui/prompts";

describe("ensureDefaultModelOption", () => {
  test("prepends an existing custom model so autocomplete can retain it", () => {
    const models = ["model-a", "model-b"];

    expect(ensureDefaultModelOption(models, "custom-model")).toEqual([
      "custom-model",
      "model-a",
      "model-b",
    ]);
  });

  test("does not duplicate a model already returned by the provider", () => {
    const models = ["model-a", "model-b"];

    expect(ensureDefaultModelOption(models, "model-b")).toBe(models);
  });

  test("ignores an empty default and preserves a failed model load", () => {
    const models = ["model-a"];

    expect(ensureDefaultModelOption(models, "  ")).toBe(models);
    expect(ensureDefaultModelOption(null, "custom-model")).toBeNull();
  });
});
