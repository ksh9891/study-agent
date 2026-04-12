#!/usr/bin/env node

import { Command } from "commander";
import { resolveRepoPath } from "./helpers/repo-resolver.js";
import { runCommand } from "./commands/run.js";
import { scaffoldCommand } from "./commands/scaffold.js";
import { gradeCommand } from "./commands/grade.js";
import { gradeQuizCommand } from "./commands/grade-quiz.js";
import { progressCommand } from "./commands/progress.js";

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
    console.log(await runCommand(repoPath, { force: opts.force }));
  });

program
  .command("scaffold")
  .description("Generate exercise scaffold for a session")
  .requiredOption("--repo <path>", "Path to target repository")
  .requiredOption("--session <id>", "Session ID")
  .option("--json", "Output as JSON", true)
  .action(async (opts) => {
    const repoPath = resolveRepoPath(opts.repo);
    console.log(await scaffoldCommand(repoPath, opts.session));
  });

program
  .command("grade")
  .description("Grade exercise submission")
  .requiredOption("--repo <path>", "Path to target repository")
  .requiredOption("--session <id>", "Session ID")
  .requiredOption("--submission-path <path>", "Path to submission")
  .option("--json", "Output as JSON", true)
  .action(async (opts) => {
    const repoPath = resolveRepoPath(opts.repo);
    console.log(await gradeCommand(repoPath, opts.session, opts.submissionPath));
  });

program
  .command("grade-quiz")
  .description("Grade quiz answers")
  .requiredOption("--repo <path>", "Path to target repository")
  .requiredOption("--session <id>", "Session ID")
  .requiredOption("--answers-file <path>", "Path to answers JSON file")
  .option("--json", "Output as JSON", true)
  .action(async (opts) => {
    const repoPath = resolveRepoPath(opts.repo);
    console.log(await gradeQuizCommand(repoPath, opts.session, opts.answersFile));
  });

program
  .command("progress")
  .description("Show study progress")
  .requiredOption("--repo <path>", "Path to target repository")
  .option("--json", "Output as JSON", true)
  .action(async (opts) => {
    const repoPath = resolveRepoPath(opts.repo);
    console.log(await progressCommand(repoPath));
  });

program.parse();
