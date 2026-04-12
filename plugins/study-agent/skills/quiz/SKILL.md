---
name: quiz
description: Run concept quiz for a study session
---

## Purpose

Conduct a concept quiz for the session and grade it deterministically.

## Quiz State Flow

not_started → collecting_answers → graded → reflection_done

## Argument Rules

1. Session ID provided → use that session
2. Session ID omitted → use current in_progress session

## Execution Flow

### Phase 1: collecting_answers

1. Run: `study-agent-engine scaffold --repo . --session <id> --json` to verify session exists
2. Read the quiz spec from `.study-agent/quiz/<session-id>/quiz.json`
3. Present each graded question one at a time:
   - For multiple_choice: show the prompt and all choices
   - For short_answer: show the prompt and ask for input
   - For matching/ordering: show the prompt with instructions
4. After all graded answers are collected, save them to a temp file:

```json
{
  "sessionId": "<session-id>",
  "answers": [
    { "questionId": "q1", "answer": "B" },
    { "questionId": "q2", "answer": "BeanDefinition" }
  ]
}
```

### Phase 2: graded

5. Run: `study-agent-engine grade-quiz --repo . --session <id> --answers-file <temp-path> --json`
6. Show results:
   - Total score and passing score
   - Pass/fail status
   - For each wrong answer, show what was expected (without revealing it was from answerKey)

### Phase 3: reflection_done

7. If reflection questions exist in the quiz spec, present them AFTER grading:
   - Show each reflection question
   - Let the user answer freely
   - Provide coaching feedback based on rubric/expectedPoints/feedbackHints
   - Clearly state: "This does not affect your quiz score"

## Interruption Policy

- If the user stops mid-quiz, collected answers are lost
- On restart, begin from the first question

## Prohibitions

- Do NOT reveal answer key values before or during quiz
- Do NOT start reflection questions before graded quiz is complete
- Do NOT count reflection answers toward pass/fail
