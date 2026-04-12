---
name: pr-review-loop
description: Create PR, run 5-agent parallel code review with confidence scoring, auto-fix issues, and iterate until clean
---

## Purpose

Automate the PR → Review → Fix → Push → Re-review loop. Uses 5 parallel review agents for independent analysis, scores each issue for confidence, filters false positives, auto-fixes real issues, and iterates until clean.

## Argument Rules

1. No arguments: reviews current branch against its base (usually `main`)
2. `--base <branch>`: specify a different base branch
3. `--max-iterations <n>`: max review-fix cycles (default: 3)

## Preconditions

- Current branch is NOT `main`/`master`
- All tests pass before starting
- Changes are committed (no dirty working tree)

## Execution Flow

### Phase 0: Pre-flight

1. Verify not on main/master
2. Run the project test suite — **STOP if tests fail**
3. Verify clean working tree (`git status --porcelain`)
4. Determine base branch (default: `main`)
5. Get the full diff: `git diff <base>...HEAD`
6. Collect CLAUDE.md files: root `CLAUDE.md` + any `CLAUDE.md` in directories touched by the diff

### Phase 1: Create or Update PR

1. Check if a PR already exists: `gh pr view --json number 2>/dev/null`
2. If no PR exists:
   - Push branch: `git push -u origin <branch>`
   - Create PR: `gh pr create --title "<title>" --body "<body>" --draft`
3. If PR exists:
   - Push latest: `git push`

### Phase 2: Review Loop

Set `iteration = 0`, `max_iterations = 3` (or user-specified).

**Loop start:**

1. Increment `iteration`
2. If `iteration > max_iterations`:
   - Report: "Max review iterations reached. Remaining issues listed below."
   - Show remaining issues
   - **EXIT loop**

#### Step 2A: 5-Agent Parallel Review

Dispatch 5 Sonnet agents **in parallel**, each with the diff and CLAUDE.md paths:

**Agent 1 — CLAUDE.md Compliance:**
Read all collected CLAUDE.md files. Check if the PR changes violate any rules.
Return issues with reason: `"CLAUDE.md adherence"` and quote the specific rule.

**Agent 2 — Bug Scan (Shallow):**
Read only the changed lines in the diff. Scan for obvious bugs, logic errors, security issues.
Do NOT read surrounding context beyond the diff. Focus on large bugs, ignore nitpicks.
Return issues with reason: `"bug"`.

**Agent 3 — Historical Context:**
Run `git blame` and `git log` on modified files. Identify bugs visible only with historical context
(e.g., reverted fix, contradicted assumption, regression).
Return issues with reason: `"historical git context"`.

**Agent 4 — Previous PR Patterns:**
Find previous PRs that touched these files (`gh pr list --search "file:..." --state merged`).
Check comments on those PRs for recurring issues that also apply here.
Return issues with reason: `"previous PR pattern"`.

**Agent 5 — Code Comment Compliance:**
Read code comments (TODO, FIXME, NOTE, doc comments) in modified files.
Check if the PR changes comply with or contradict guidance in those comments.
Return issues with reason: `"code comment violation"`.

Each agent returns issues as:
```json
{ "severity": "Critical|Important|Minor", "file": "path", "line": 42,
  "description": "what's wrong", "suggestion": "how to fix", "reason": "..." }
```

#### Step 2B: Confidence Scoring

Merge all issues from the 5 agents. For each unique issue, dispatch a **Haiku agent** (in parallel) that:

1. Takes the issue, the PR diff, and the CLAUDE.md file paths
2. Scores confidence 0–100:
   - **0**: False positive. Doesn't hold up to scrutiny, or pre-existing issue.
   - **25**: Might be real, but unverified. Stylistic issues not explicitly in CLAUDE.md.
   - **50**: Verified real, but a nitpick or unlikely in practice. Not important relative to the PR.
   - **75**: Double-checked and very likely real. Will impact functionality, or directly mentioned in CLAUDE.md.
   - **100**: Confirmed real. Will happen frequently. Evidence directly proves it.
3. For CLAUDE.md issues: verify the CLAUDE.md actually calls out that specific rule.
4. Returns: `{ issue, score, reasoning }`

#### Step 2C: Filter and Decide

1. **Discard** all issues with score < 75
2. Classify remaining:
   - Score >= 75 with severity Critical/Important → **must fix**
   - Score >= 75 with severity Minor → **note only** (do not fix)
3. If no must-fix issues → **EXIT loop** (PASS)

#### Step 2D: Auto-Fix

For each must-fix issue (sorted by file, then line):

1. Read the affected file
2. Apply the suggested fix
3. Verify the fix doesn't break tests (quick check on affected package)

After all fixes:
1. Run full test suite
2. If tests fail → revert all fixes from this iteration, report, **EXIT loop**
3. If tests pass → commit: `fix: address review feedback (iteration N)`
4. Push: `git push`

**Go to Loop start**

### Phase 3: Completion

After exiting the loop:

1. **PASS (no must-fix issues remain):**
   - Mark PR as ready: `gh pr ready`
   - Post summary comment on PR via `gh pr comment`:
     ```
     ### Automated Review Complete

     Reviewed in N iteration(s). All high-confidence issues resolved.

     Issues found and fixed: <count>
     Issues noted (minor): <count>
     False positives filtered: <count>
     ```
   - Report to user: "PR ready for human review."

2. **Max iterations reached:**
   - Keep PR as draft
   - Post comment listing remaining unresolved issues with scores
   - Report remaining issues to user

3. **Tests broke during fix:**
   - Keep PR as draft
   - Report what happened, suggest manual intervention

## False Positive Heuristics

These are NOT real issues — instruct all agents to skip:

- Pre-existing issues (code not touched in this PR)
- Things a linter/typechecker/compiler would catch (imports, types, formatting)
- General code quality (test coverage, docs) unless explicitly required in CLAUDE.md
- Issues silenced by lint-ignore comments
- Functionality changes that are clearly intentional for the PR's purpose
- Pedantic nitpicks a senior engineer wouldn't flag

## Prohibitions

- Do NOT run on main/master branch
- Do NOT force-push
- Do NOT fix issues scored below 75
- Do NOT fix Minor-severity issues (note them only)
- Do NOT exceed max iterations — report remaining issues instead
- Do NOT skip test verification after fixes
- Do NOT mark PR as ready if Critical issues with score >= 75 remain
- Do NOT attempt to build/typecheck — CI handles that separately
