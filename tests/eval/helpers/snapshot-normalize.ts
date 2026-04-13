import { tmpdir } from "node:os";

export interface NormalizeContext {
  repoRoot: string;
}

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const TMP_ROOT = tmpdir();

export function normalize(value: unknown, ctx: NormalizeContext): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return normalizeString(value, ctx);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => normalize(v, ctx));

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = normalize(obj[k], ctx);
  return out;
}

function normalizeString(s: string, ctx: NormalizeContext): string {
  if (ISO_TS.test(s)) return "<TIMESTAMP>";
  let out = s;
  if (ctx.repoRoot && out.includes(ctx.repoRoot)) {
    out = out.split(ctx.repoRoot).join("<REPO_ROOT>");
  }
  if (out.includes(TMP_ROOT)) {
    out = out.split(TMP_ROOT).join("<TMP>");
  }
  return out;
}
