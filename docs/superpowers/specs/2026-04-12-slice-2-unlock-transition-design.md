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
- `next` CLI command
- Session 2 fully authored (exercise bundle + quiz + hidden tests)
- Integration test covering 2-session unlock flow

---

## 2. Unlock Transition Logic

### 2.1 Design Decision

**Approach A: Grade-time auto-unlock** (selected)

Grade/grade-quiz가 세션을 `passed`로 변경한 직후, 후속 세션의 unlock 조건을 자동 체크하여 `locked → available`로 전환한다.

Rationale: progress.json이 항상 정확한 상태를 반영하고, 별도 unlock 호출이 불필요하다.

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

`grade.ts` / `grade-quiz.ts` 수정:
- 채점 후 상태가 `passed`이면 `checkAndUnlock(sessions)` 호출
- 결과 객체에 `unlockedSessions: string[]` 필드 추가

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

1. progress에서 `available` 상태인 세션 중 conceptOrder 기준 첫 번째 → `next_available`
2. `available` 없으면 `in_progress` 상태인 세션 반환 → `in_progress`
3. 모든 세션이 `passed`면 `nextSession: null` → `all_completed`

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
- `ComponentScanner.java.tmpl` — `@Component` 클래스 탐색 → BeanDefinition 변환 → registry 등록 (TODO)

**Expected Artifacts:** `BeanDefinitionRegistry.java`, `SimpleBeanDefinitionRegistry.java`, `Component.java`, `ComponentScanner.java`

### 4.3 Hidden Tests

**File:** `hidden-tests/RegistryTest.java`

**Verification Items:**
- registry.register(def) → registry.get(name) 조회 성공
- ComponentScanner가 `@Component` 클래스를 탐색하여 자동 등록
- 중복 등록 시 덮어쓰기 동작
- 미등록 빈 조회 시 null 반환
- registry.getAll()이 전체 등록 목록 반환

### 4.4 Quiz Spec

**4 graded questions + 1 reflection:**

| ID | Type | Topic | Weight |
|----|------|-------|--------|
| q1 | multiple_choice | BeanDefinitionRegistry의 역할 | 25 |
| q2 | short_answer | Component scanning이 하는 일 | 25 |
| q3 | multiple_choice | registration vs instantiation 차이 | 25 |
| q4 | short_answer | @ComponentScan의 동작 범위 | 25 |
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

2. 세션 1 exercise grade → passed (exerciseScore: 100)

3. 세션 1 quiz grade-quiz → passed (quizScore: 100)
   → checkAndUnlock() 자동 호출
   → 세션 2: locked → available 검증

4. next
   → 세션 2 추천, reason: "next_available"

5. 세션 2 exercise grade → passed

6. 세션 2 quiz grade-quiz → passed
   → 세션 3: locked → available 검증 (컨텐츠는 없지만 상태 전환 확인)

7. 실패 케이스: quiz score < 60일 때 unlock 안 됨 검증
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

---

## 7. Out of Scope

- `/study-agent:next` plugin skill (plugin skill 추가는 Slice 2에서 선택적)
- Session 3~6 exercise/quiz authoring (Slice 3)
- Eval harness (Slice 3)
- `planStatus: stale` handling (기존 reused/fresh만 유지)
