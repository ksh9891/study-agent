---
name: grade
description: Grade exercise submission for a study session
---

## Purpose

Grade the user's exercise submission using the engine's deterministic grading.

## Argument Rules

1. Session ID provided → use that session
2. Session ID omitted → use current in_progress session
3. Submission path: use the convention path `.study-agent/exercises/<session-id>/starter/`

## Execution Flow

1. Determine the submission path: `.study-agent/exercises/<session-id>/starter/`
2. Run: `study-agent-engine grade --repo . --session <id> --submission-path <path> --json`
3. If successful:
   - Show pass/fail status and score
   - For each rubric item, explain what passed and what failed
   - Provide the feedback messages
   - Based on nextAction: suggest retry, review, or advance to next session

## Prohibitions

- Do NOT override the engine's pass/fail judgment
- Do NOT reveal hidden test implementation details
