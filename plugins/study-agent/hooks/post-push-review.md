---
name: post-push-review
event: PostToolUse
matcher: Bash
description: After git push, remind to run PR review loop
---

## Trigger Condition

This hook fires after any `Bash` tool use. It checks if the command was a `git push`.

## Prompt

When a `git push` command succeeds and the current branch is not `main` or `master`:

```
Push completed. Consider running /study-agent:pr-review-loop to automatically review and fix issues before requesting human review.
```

Only show this reminder once per session (track via conversation context).
