#!/usr/bin/env node

import { Command } from "commander";
import { resolveRepoPath } from "./helpers/repo-resolver.js";
import { runCommand } from "./commands/run.js";

const program = new Command();

program
  .name("study-agent-engine")
  .description("Study Agent deterministic learning engine")
  .version("0.1.0");

program
  .command("run")
  .description("Analyze repo and generate study plan")
  .requiredOption("--repo <path>", "Path to target repository")
  .option("--json", "Output as JSON", true)
  .option("--force", "Force regenerate even if plan exists")
  .action(async (opts) => {
    const repoPath = resolveRepoPath(opts.repo);
    const output = await runCommand(repoPath);
    console.log(output);
  });

program.parse();
