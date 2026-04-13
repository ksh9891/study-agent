import { expect } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { normalize, type NormalizeContext } from "./snapshot-normalize.js";

function isUpdateMode(): boolean {
  return process.env.UPDATE_GOLDEN === "1";
}

export function assertGoldenEquals(
  actual: unknown,
  goldenPath: string,
  ctx: NormalizeContext
): void {
  const normalized = normalize(actual, ctx);

  if (isUpdateMode()) {
    mkdirSync(dirname(goldenPath), { recursive: true });
    writeFileSync(goldenPath, JSON.stringify(normalized, null, 2) + "\n", "utf-8");
    return;
  }

  if (!existsSync(goldenPath)) {
    throw new Error(
      `No golden at ${goldenPath}. Run 'UPDATE_GOLDEN=1 pnpm test:eval' to create.`
    );
  }

  const golden = JSON.parse(readFileSync(goldenPath, "utf-8"));
  expect(normalized).toEqual(golden);
}

export function assertGoldenFileEquals(actualPath: string, goldenPath: string): void {
  if (isUpdateMode()) {
    mkdirSync(dirname(goldenPath), { recursive: true });
    copyFileSync(actualPath, goldenPath);
    return;
  }

  if (!existsSync(goldenPath)) {
    throw new Error(
      `No golden at ${goldenPath}. Run 'UPDATE_GOLDEN=1 pnpm test:eval' to create.`
    );
  }

  const actual = readFileSync(actualPath, "utf-8");
  const golden = readFileSync(goldenPath, "utf-8");
  expect(actual).toEqual(golden);
}
