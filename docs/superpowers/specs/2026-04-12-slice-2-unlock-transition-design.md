# Slice 2: Session 2 + Unlock Transition — Design Spec

## Document Info

- Date: 2026-04-12
- Based on: 2026-04-11-study-agent-design.md §7.4
- Status: Approved, implementation plan pending
- Prerequisite: Slice 0+1 merged (PR #1)

---

## 1. Goal

Slice 2 completes the **MVP 1.0 finish line**: two sessions fully working with unlock transition between them.

**Deliverables:**
- Unlock transition logic (grade 시점 자동 trigger)
- `next` CLI command + `/study-agent:next` plugin skill
- `planStatus: stale` handling (세션 구조 변경 감지)
- Session 2 fully authored (exercise bundle + quiz + hidden tests)
- Integration test covering 2-session unlock flow

---

## 2. Unlock Transition Logic

### 2.1 Design Decision

**Approach A: Grade-time auto-unlock** (selected)

Grade/grade-quiz가 채점을 완료한 직후, 해당 세션의 overall status를 재계산하고, `passed`가 되면 후속 세션의 unlock 조건을 자동 체크하여 `locked → available`로 전환한다.

Rationale: progress.json이 항상 정확한 상태를 반영하고, 별도 unlock 호출이 불필요하다.

### 2.1.1 Session Status와 Sub-Result 모델

세션의 overall status는 sub-result(exercise, quiz)의 조합으로 결정된다:

```ts
interface SessionProgress {
  status: "locked" | "available" | "in_progress" | "passed" | "failed";
  exercisePassed?: boolean;   // exercise hidden test 통과 여부
  exerciseScore?: number;     // 0-100
  quizPassed?: boolean;       // quiz passing score 이상 여부
  quizScore?: number;         // 0-100
  lastAttempt?: string;       // ISO timestamp
}
```

**Overall `passed` 판정 규칙:**
- `requireExercise && requireQuiz`: exercisePassed=true AND quizPassed=true일 때만 `passed`
- `requireExercise only`: exercisePassed=true면 `passed`
- `requireQuiz only`: quizPassed=true면 `passed`

**상태 전이:**
- exercise grade → exercisePassed/exerciseScore 기록, quiz 미완이면 status는 `in_progress` 유지
- quiz grade → quizPassed/quizScore 기록, 둘 다 충족되면 status를 `passed`로 전환
- 순서 무관: quiz 먼저 통과 후 exercise를 통과해도 동일하게 `passed`

### 2.2 `checkAndUnlock()` Method

Location: `packages/engine-core/src/progress/progress-store.ts`

```ts
checkAndUnlock(sessions: StudySessionSpec[]): string[]
```

**Algorithm:**
1. 현재 progress에서 `locked` 상태인 세션만 필터
2. 각 locked 세션의 `unlockRule`을 확인:
   - `prerequisites`: 모든 prerequisite 세션이 `passed` 상태인지
   - `requireExercise`: true이면 prerequisite의 exerciseScore가 존재해야 함
   - `requireQuiz`: true이면 prerequisite의 quizScore가 존재해야 함
   - `minQuizScore`: prerequisite 세션의 quizScore가 minQuizScore 이상인지
   - 모든 조건이 AND로 결합 (전부 충족해야 unlock)
3. 조건 충족 시 `locked → available`로 전환
4. 변경된 세션 ID 목록 반환
5. progress.json에 저장

### 2.3 Grade Command Integration

`grade.ts` 수정:
- exercise 채점 후 exercisePassed/exerciseScore 기록
- overall passed 판정 (quiz도 이미 통과했는지 확인)
- passed가 되면 `checkAndUnlock(sessions)` 호출
- 결과 객체에 `unlockedSessions: string[]` 필드 추가

`grade-quiz.ts` 수정:
- quiz 채점 후 quizPassed/quizScore 기록
- overall passed 판정 (exercise도 이미 통과했는지 확인)
- passed가 되면 `checkAndUnlock(sessions)` 호출
- 결과 객체에 `unlockedSessions: string[]` 필드 추가

**Overall passed 판정 함수** (`progress-store.ts`에 추가):
```ts
isSessionPassed(sessionId: string, unlockRule: UnlockRule): boolean
```
unlockRule의 requireExercise/requireQuiz를 보고 sub-result를 조합하여 판정.

---

## 3. `next` Command

### 3.1 CLI Interface

```
study-agent-engine next --repo <path> --json
```

### 3.2 Return Type

```ts
interface NextResult {
  nextSession: StudySessionSpec | null;
  reason: "next_available" | "in_progress" | "all_completed";
}
```

### 3.3 Selection Logic

1. `in_progress` 상태인 세션이 있으면 conceptOrder 기준 첫 번째 반환 → `in_progress` (이미 시작한 세션 이어가기 우선)
2. `in_progress` 없으면 `available` 상태인 세션 중 conceptOrder 기준 첫 번째 → `next_available`
3. 모든 세션이 `passed`면 `nextSession: null` → `all_completed`

Rationale: 사용자가 이미 시작한 세션이 있다면 "다음"은 새 세션이 아니라 진행 중인 세션을 이어가는 게 자연스럽다.

---

## 4. Session 2 Content

### 4.1 Overview

- Concept: `spring.di.02 — Bean Registration and BeanDefinition`
- Theme: Annotation 기반 빈 등록 메커니즘 직접 구현
- Builds on session 1: Container + BeanDefinition 위에 registry + scanning 추가

### 4.2 Exercise Bundle

**Directory:** `packages/pack-spring-core/exercises/di-02-bean-registration/`

**Starter Files:**
- `BeanDefinitionRegistry.java.tmpl` — register, get, getAll 메서드 인터페이스
- `SimpleBeanDefinitionRegistry.java.tmpl` — 구현 클래스 (TODO)
- `Component.java.tmpl` — `@Component` 커스텀 annotation 제공 (완성)
- `ComponentScanner.java.tmpl` — **명시적으로 전달받은 Class[] 목록**에서 `@Component` 붙은 클래스를 필터 → BeanDefinition 변환 → registry 등록 (TODO)

**범위 제한:** ComponentScanner는 실제 classpath scanning을 하지 않는다. `scan(Class<?>... candidates)` 메서드가 candidate 목록을 인자로 받아 `@Component` annotation 여부만 검사한다. 학습 목적은 "annotation 기반 등록 메커니즘"이지 classpath scanning 구현이 아니다.

**Expected Artifacts:** `BeanDefinitionRegistry.java`, `SimpleBeanDefinitionRegistry.java`, `Component.java`, `ComponentScanner.java`

### 4.3 Hidden Tests

**File:** `hidden-tests/RegistryTest.java`

**Verification Items:**
- registry.register(def) → registry.get(name) 조회 성공
- ComponentScanner.scan(candidates)이 `@Component` 클래스만 필터하여 registry에 자동 등록
- `@Component` 없는 클래스는 무시됨
- 중복 등록 시 덮어쓰기 동작
- 미등록 빈 조회 시 null 반환
- registry.getAll()이 전체 등록 목록 반환

### 4.4 Quiz Spec

**4 graded questions + 1 reflection:**

| ID | Type | Topic | Weight |
|----|------|-------|--------|
| q1 | multiple_choice | BeanDefinitionRegistry의 역할 | 25 |
| q2 | short_answer | Component scanning이 하는 일 (candidate 목록에서 @Component 필터링) | 25 |
| q3 | multiple_choice | registration vs instantiation 차이 | 25 |
| q4 | short_answer | scanner가 base package 대신 candidate 목록을 받는 이유 (학습 단순화 vs 실제 Spring) | 25 |
| r1 | reflection | 왜 빈 등록과 생성을 분리하는가 | — |

**Passing Score:** 60

---

## 5. Integration Test

### 5.1 Test File

`tests/integration/session-2-unlock-transition.test.ts`

### 5.2 Test Flow

```
1. engine.run()
   → 세션 목록 생성
   → 세션 1: available, 세션 2: locked

2. 세션 1 exercise grade
   → exercisePassed: true, exerciseScore: 100
   → quiz 미완이므로 overall status: in_progress (passed 아님)
   → checkAndUnlock 호출되지 않음, 세션 2: 여전히 locked

3. 세션 1 quiz grade-quiz (score: 100, >= 60)
   → quizPassed: true, quizScore: 100
   → exercise + quiz 모두 통과 → overall status: passed
   → checkAndUnlock() 자동 호출
   → 세션 2: locked → available 검증

4. next
   → 세션 2 추천, reason: "next_available"

5. 세션 2 exercise grade
   → exercisePassed: true, overall status: in_progress

6. 세션 2 quiz grade-quiz (score >= 60)
   → overall status: passed
   → 세션 3: locked → available 검증 (컨텐츠는 없지만 상태 전환 확인)

7. 실패 케이스: quiz score < 60일 때
   → quizPassed: false, overall status: in_progress (passed 아님)
   → unlock 안 됨 검증

8. 실패 후 재시도: quiz 재채점 score >= 60
   → overall status: passed, unlock 발생 검증
```

---

## 6. Modified/Created Files Summary

| Action | File |
|--------|------|
| Modify | `packages/engine-core/src/progress/progress-store.ts` — add `checkAndUnlock()` |
| Modify | `apps/engine-cli/src/commands/grade.ts` — call checkAndUnlock after pass |
| Modify | `apps/engine-cli/src/commands/grade-quiz.ts` — call checkAndUnlock after pass |
| Create | `apps/engine-cli/src/commands/next.ts` — next command |
| Modify | `apps/engine-cli/src/index.ts` — register next command |
| Create | `packages/pack-spring-core/exercises/di-02-bean-registration/exercise.yaml` |
| Create | `packages/pack-spring-core/exercises/di-02-bean-registration/starter/*.tmpl` |
| Create | `packages/pack-spring-core/exercises/di-02-bean-registration/starter/README.md` |
| Create | `packages/pack-spring-core/exercises/di-02-bean-registration/hidden-tests/RegistryTest.java` |
| Modify | `packages/pack-spring-core/src/exercise-builder.ts` — map session 2 |
| Modify | `packages/pack-spring-core/src/quiz-builder.ts` — add session 2 quiz spec |
| Create | `tests/integration/session-2-unlock-transition.test.ts` |
| Modify | `apps/engine-cli/src/commands/run.ts` — add `stale` detection |
| Create | `plugins/study-agent/skills/next/SKILL.md` — `/study-agent:next` skill |

---

## 7. `planStatus: stale` Handling

기존 `run` 커맨드는 `fresh`(새로 생성)과 `reused`(기존 sessions.json 재사용)를 반환한다.

Slice 2에서 `stale` 추가:
- `run` 실행 시 기존 sessions.json의 hash/version을 pack의 현재 session 구조와 비교
- 구조가 변경됐으면 `planStatus: "stale"` 반환 + 사용자에게 `--force`로 재생성 안내
- 비교 방식: session ID 목록 + conceptOrder 일치 여부 (간단한 structural check)

---

## 8. `/study-agent:next` Plugin Skill

기존 스펙 §6.2에 정의된 plugin skill:
- `engine next --repo . --json` 호출 후 결과를 사용자에게 표시
- 추천 세션의 title, learningGoals, 현재 progress 요약 포함

---

## 9. Out of Scope

- Session 3~6 exercise/quiz authoring (Slice 3)
- Eval harness (Slice 3)
