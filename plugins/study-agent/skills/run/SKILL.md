---
name: run
description: Analyze current repo and generate study plan with sessions
---

## Purpose

Analyze the current repository, detect the language and relevant study pack, generate a study plan with sessions, and start the first session.

## Argument Rules

No arguments needed. Uses the current repository.

## Preconditions

- Current directory should be the root of the target repository

## Execution Flow

1. Run: `study-agent-engine run --repo . --json`
2. Check the `planStatus` field in the response:
   - `fresh`: New plan created. Summarize the detected language, matched pack, and list all sessions with their titles, difficulty, and lock status. Then start explaining the first available session.
   - `reused`: Existing plan found. Show current progress and offer to continue from where the user left off.
   - `stale`: Repository has changed since last run. Ask the user if they want to regenerate: `study-agent-engine run --repo . --json --force`
3. If `ok: false`, explain the error to the user based on `error.code`:
   - `ADAPTER_NOT_FOUND`: No supported language detected
   - `PACK_NOT_FOUND`: No study pack matches this repository

## Error Handling

If the command fails, read the error code and message and explain to the user what went wrong and how to fix it.

## Prohibitions

- Do NOT modify the concept graph or session order
- Do NOT add sessions that the engine did not generate
- Do NOT mention or hint at hidden test contents
- Do NOT make planStatus judgments yourself — always follow the engine response
