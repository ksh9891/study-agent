import { describe, it, expect } from "vitest";
import { normalize } from "./snapshot-normalize.js";
import { tmpdir } from "node:os";

describe("normalize", () => {
  const ctx = { repoRoot: "/tmp/abc/fixture-xyz" };

  it("replaces repoRoot with <REPO_ROOT> inside strings", () => {
    expect(normalize({ path: "/tmp/abc/fixture-xyz/.study-agent/x.json" }, ctx))
      .toEqual({ path: "<REPO_ROOT>/.study-agent/x.json" });
  });

  it("replaces ISO timestamps with <TIMESTAMP>", () => {
    expect(normalize({ lastAttempt: "2026-04-13T10:20:30.123Z" }, ctx))
      .toEqual({ lastAttempt: "<TIMESTAMP>" });
    expect(normalize({ ts: "2026-04-13T10:20:30Z" }, ctx))
      .toEqual({ ts: "<TIMESTAMP>" });
  });

  it("replaces os.tmpdir() prefix with <TMP>", () => {
    const t = tmpdir();
    expect(normalize({ p: `${t}/something/else` }, { repoRoot: "/other" }))
      .toEqual({ p: "<TMP>/something/else" });
  });

  it("sorts object keys alphabetically after recursion", () => {
    const result = normalize({ b: 1, a: { z: 1, y: 2 }, c: 3 }, ctx) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(["a", "b", "c"]);
    expect(Object.keys(result.a as Record<string, unknown>)).toEqual(["y", "z"]);
  });

  it("preserves array order", () => {
    expect(normalize({ arr: [3, 1, 2] }, ctx)).toEqual({ arr: [3, 1, 2] });
  });

  it("handles primitives and null", () => {
    expect(normalize(null, ctx)).toBeNull();
    expect(normalize(42, ctx)).toBe(42);
    expect(normalize(true, ctx)).toBe(true);
    expect(normalize("plain string", ctx)).toBe("plain string");
  });

  it("does not mutate input", () => {
    const input = { a: { b: 1 } };
    normalize(input, ctx);
    expect(input).toEqual({ a: { b: 1 } });
  });
});
