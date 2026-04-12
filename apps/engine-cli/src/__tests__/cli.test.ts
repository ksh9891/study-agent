import { describe, it, expect } from "vitest";
import { resolveRepoPath } from "../helpers/repo-resolver.js";
import { formatSuccess, formatError } from "../helpers/output.js";

describe("repo-resolver", () => {
  it("resolves absolute path as-is", () => {
    expect(resolveRepoPath("/tmp/my-repo")).toBe("/tmp/my-repo");
  });

  it("resolves . to cwd", () => {
    const result = resolveRepoPath(".");
    expect(result).toBe(process.cwd());
  });
});

describe("output helpers", () => {
  it("formatSuccess creates ok:true envelope", () => {
    const out = formatSuccess("run", "/tmp/repo", { sessions: [] });
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe("run");
    expect(parsed.data.sessions).toEqual([]);
  });

  it("formatError creates ok:false envelope", () => {
    const out = formatError("run", "/tmp/repo", "NOT_FOUND", "Pack not found");
    const parsed = JSON.parse(out);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });
});
