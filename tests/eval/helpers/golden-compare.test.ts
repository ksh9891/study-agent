import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertGoldenEquals, assertGoldenFileEquals } from "./golden-compare.js";

describe("assertGoldenEquals", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "golden-test-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.UPDATE_GOLDEN; });

  it("passes when normalized actual matches existing golden", () => {
    const goldenPath = join(dir, "g.json");
    writeFileSync(goldenPath, JSON.stringify({ a: 1, b: "<REPO_ROOT>/x" }, null, 2));
    expect(() =>
      assertGoldenEquals({ a: 1, b: "/tmp/fix/x" }, goldenPath, { repoRoot: "/tmp/fix" })
    ).not.toThrow();
  });

  it("fails with a clear message when golden is missing and UPDATE_GOLDEN not set", () => {
    const goldenPath = join(dir, "missing.json");
    expect(() =>
      assertGoldenEquals({ a: 1 }, goldenPath, { repoRoot: "/tmp/fix" })
    ).toThrow(/UPDATE_GOLDEN=1/);
  });

  it("writes golden when UPDATE_GOLDEN=1 and golden is missing", () => {
    process.env.UPDATE_GOLDEN = "1";
    const goldenPath = join(dir, "nested", "g.json");
    assertGoldenEquals({ a: 1, b: "/tmp/fix/x" }, goldenPath, { repoRoot: "/tmp/fix" });
    expect(existsSync(goldenPath)).toBe(true);
    const stored = JSON.parse(readFileSync(goldenPath, "utf-8"));
    expect(stored).toEqual({ a: 1, b: "<REPO_ROOT>/x" });
  });

  it("overwrites golden when UPDATE_GOLDEN=1 and content changed", () => {
    process.env.UPDATE_GOLDEN = "1";
    const goldenPath = join(dir, "g.json");
    writeFileSync(goldenPath, JSON.stringify({ old: true }, null, 2));
    assertGoldenEquals({ a: 2 }, goldenPath, { repoRoot: "/tmp/fix" });
    const stored = JSON.parse(readFileSync(goldenPath, "utf-8"));
    expect(stored).toEqual({ a: 2 });
  });

  it("fails with a diff when normalized actual differs from golden", () => {
    const goldenPath = join(dir, "g.json");
    writeFileSync(goldenPath, JSON.stringify({ a: 1 }, null, 2));
    expect(() =>
      assertGoldenEquals({ a: 2 }, goldenPath, { repoRoot: "/tmp/fix" })
    ).toThrow();
  });
});

describe("assertGoldenFileEquals (raw text)", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "golden-file-test-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.UPDATE_GOLDEN; });

  it("passes when actual file bytes equal golden file bytes", () => {
    const actual = join(dir, "a.java"); writeFileSync(actual, "class A {}");
    const golden = join(dir, "g.java"); writeFileSync(golden, "class A {}");
    expect(() => assertGoldenFileEquals(actual, golden)).not.toThrow();
  });

  it("fails when actual and golden differ", () => {
    const actual = join(dir, "a.java"); writeFileSync(actual, "class A {}");
    const golden = join(dir, "g.java"); writeFileSync(golden, "class B {}");
    expect(() => assertGoldenFileEquals(actual, golden)).toThrow();
  });

  it("copies actual to golden when UPDATE_GOLDEN=1 and golden missing", () => {
    process.env.UPDATE_GOLDEN = "1";
    const actual = join(dir, "a.java"); writeFileSync(actual, "class A {}");
    const golden = join(dir, "nested", "g.java");
    assertGoldenFileEquals(actual, golden);
    expect(readFileSync(golden, "utf-8")).toBe("class A {}");
  });

  it("fails with UPDATE_GOLDEN=1 message when golden missing and flag unset", () => {
    const actual = join(dir, "a.java"); writeFileSync(actual, "class A {}");
    const golden = join(dir, "g.java");
    expect(() => assertGoldenFileEquals(actual, golden)).toThrow(/UPDATE_GOLDEN=1/);
  });
});
