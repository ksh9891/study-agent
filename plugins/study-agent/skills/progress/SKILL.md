---
name: progress
description: Show study progress and session status
---

## Purpose

Display the user's current study progress across all sessions.

## Execution Flow

1. Run: `study-agent-engine progress --repo . --json`
2. If successful:
   - Show a summary table of all sessions with status (locked/available/in_progress/passed/failed)
   - Show scores where available
   - Recommend the next session to work on
3. If no progress exists, suggest running `/study-agent:run` first

## Prohibitions

- Do NOT change session statuses yourself
