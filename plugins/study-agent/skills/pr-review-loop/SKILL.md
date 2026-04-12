---
name: pr-review-loop
description: Create PR, run automated code review, fix issues, and iterate until clean
---

## Purpose

Automate the PR → Review → Fix → Push → Re-review loop. Dispatches a code-reviewer agent on the branch diff, fixes discovered issues, and iterates until the review passes or a maximum number of iterations is reached.

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

### Phase 1: Create or Update PR

1. Check if a PR already exists for this branch: `gh pr view --json number 2>/dev/null`
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

3. **Dispatch code-reviewer agent** with:
   - The diff (`git diff <base>...HEAD`)
   - Instructions to report issues as: `{severity, file, line, description, suggestion}`
   - Focus on: bugs, logic errors, security, spec compliance
   - Ignore: style nits, naming preferences, minor formatting

4. **Evaluate review results:**
   - If no Critical or Important issues → **EXIT loop** (PASS)
   - If only Minor issues → **EXIT loop** (PASS with notes)
   - If Critical or Important issues exist → continue to Fix phase

5. **Fix phase:**
   - For each Critical/Important issue:
     - Read the affected file
     - Apply the fix
     - Verify the fix doesn't break tests
   - After all fixes:
     - Run full test suite
     - If tests fail: revert last batch of fixes, report, **EXIT loop**
     - If tests pass: commit fixes with message `fix: address review feedback (iteration N)`
     - Push: `git push`

6. **Go to Loop start**

### Phase 3: Completion

After exiting the loop:

1. If PASS:
   - Mark PR as ready (remove draft): `gh pr ready`
   - Report: "PR ready for human review. N iterations, all issues resolved."
2. If max iterations reached:
   - Keep PR as draft
   - Report remaining issues
3. If tests broke during fix:
   - Keep PR as draft
   - Report what happened

## Review Agent Instructions

When dispatching the code-reviewer agent, use these instructions:

```
Review the diff between <base> and HEAD for this PR.

Focus ONLY on:
- Bugs and logic errors (Critical)
- Security vulnerabilities (Critical)
- Spec/requirement violations (Important)
- Missing error handling at system boundaries (Important)

Do NOT flag:
- Style preferences
- Naming conventions (unless misleading)
- Missing comments/docs
- Minor formatting

For each issue, report:
- severity: Critical | Important | Minor
- file: path
- line: number
- description: what's wrong
- suggestion: how to fix

If no Critical or Important issues: report "APPROVED"
```

## Prohibitions

- Do NOT run on main/master branch
- Do NOT force-push
- Do NOT fix Minor issues (only Critical and Important)
- Do NOT exceed max iterations — report remaining issues instead
- Do NOT skip test verification after fixes
- Do NOT mark PR as ready if Critical issues remain
