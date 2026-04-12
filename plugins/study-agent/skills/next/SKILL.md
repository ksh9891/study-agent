---
name: next
description: Recommend the next study session based on current progress
---

# /study-agent:next

Show the user which study session to work on next.

## Steps

1. Run the engine next command:

```bash
study-agent-engine next --repo . --json
```

2. Parse the JSON output and present it to the user:

**If `reason` is `in_progress`:**
> You have an ongoing session: **{title}**
> Learning goals: {learningGoals as bullet list}
> Continue with `/study-agent:exercise` to work on the exercise.

**If `reason` is `next_available`:**
> Next session unlocked: **{title}**
> Learning goals: {learningGoals as bullet list}
> Start with `/study-agent:run` to review the explanation, then `/study-agent:exercise`.

**If `reason` is `all_completed`:**
> All sessions completed! You've finished the study plan.
> Run `/study-agent:progress` to review your results.
