---
name: exercise
description: Start or resume an exercise for a study session
---

## Purpose

Generate and present the exercise scaffold for a study session.

## Argument Rules

1. Session ID provided → use that session
2. Session ID omitted → use current in_progress session
3. No in_progress → run `study-agent-engine progress --repo . --json` and pick first available
4. No available → ask the user which session they want

## Execution Flow

1. Run: `study-agent-engine scaffold --repo . --session <id> --json`
2. If successful:
   - Show the exercise title and prompt
   - List the starter files and their locations
   - Show the repo anchors (original code the user should reference)
   - Provide hints if the user asks
   - Coach the user through implementation
3. When the user indicates they are done, suggest running `/study-agent:grade`

## Prohibitions

- Do NOT reveal hidden test contents
- Do NOT write the solution for the user — coach them
- Do NOT skip straight to grading without the user asking
