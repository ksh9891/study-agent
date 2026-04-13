# Slice 3a: Eval Harness — Design Spec

## Document Info

- Date: 2026-04-13
- Based on: 2026-04-11-study-agent-design.md §7.5 (Slice 3 분해)
- Status: Approved, implementation plan pending
- Prerequisite: Slice 2 merged (MVP 1.0 완료)

---

## 1. Goal & Scope

Slice 3의 Part A. Pack/engine/adapter 변경이 사용자에게 보이는 산출물에 예상 밖 변화를 만들면 `pnpm test:eval`이 즉시 diff로 감지하도록 regression harness를 구축한다. 세션 3~6 authoring은 이 harness 위에서 Part B로 후속 진행한다.

**이 slice에서 harness가 커버하는 산출물:**
- A. Planning artifacts: `analysis.json`, `instantiated-dag.json`, `sessions.json`
- B. Exercise artifacts: public `exercise-spec.json` + materialized starter files
- C. Quiz artifacts: public `quiz.json`
- D. Grade outputs: deterministic grade 결과 (pass case + fail case 둘 다)

**Fixture:** 2개
- `sample-spring-core` (기존 `examples/sample-spring-project` 재사용) — core-only 경로
- `sample-spring-with-lifecycle` (신규) — optional concept inclusion 경로

**Out of scope:**
- Unlock/progress transition (기존 `session-2-unlock-transition.test.ts`가 커버)
- `evaluateSpringSubmission`(pack-spring-core/src/evaluator.ts) wiring — 현재 dead code, 별도 작업
- 실제 Java/Gradle hidden test 실행 회귀 (기존 integration test 유지)
- `concept-graph.json` snapshot — pack 원본 정적 JSON이라 가치 낮음
- 세션 3, 4, 5, 6 exercise/quiz authoring (Slice 3b)

### 1.1 Slice 3 완료 기준과의 관계

메인 스펙(2026-04-11) §7.5는 Slice 3 완료 기준을 "pnpm test로 전체 regression 검증"으로 기술한다. 이 3a 문서는 `pnpm test:eval`을 별도 vitest project로 두어 기본 `pnpm test`에서 분리한다.

**방침:**
- **Slice 3a 단계:** `pnpm test:eval` 분리 유지. 기본 `pnpm test`는 unit + integration만 실행. CI는 `pnpm test:all`(또는 `test + test:eval`)을 명시적으로 호출.
- **Slice 3b 완료 시점:** 세션 3~6 authoring이 끝나 harness가 안정화되면 스크립트 정책을 재정렬한다. 기본 `pnpm test`가 eval까지 포함하도록 병합하거나, `pnpm test:all`을 정식 완료 기준 명령으로 확정한다. 그 시점에 메인 스펙 §7.5의 "pnpm test" 문구도 갱신한다.

이렇게 두는 이유: 3a 단계에서는 golden이 초기 생성·수정 빈도가 높아 `pnpm test` 기본 경로에 섞어두면 local dev friction이 크다. 3b 이후에는 pack이 안정돼 friction이 낮아지므로 병합이 자연스럽다.

---

## 2. Architecture

### 2.1 Directory Layout

```
tests/eval/
  fixtures/
    sample-spring-core/                          # examples/sample-spring-project 재사용
      expected/
        analysis.json
        instantiated-dag.json
        sessions.json
        exercises/
          spring.ioc.01/
            exercise-spec.json
            starter/<filename>                   # raw text golden (§2.7 참조)
          spring.di.02/
            exercise-spec.json
            starter/<filename>
        quiz/
          spring.ioc.01/quiz.json
          spring.di.02/quiz.json
        grade/
          spring.ioc.01.passed.json
          spring.ioc.01.failing.json
          spring.di.02.passed.json
          spring.di.02.failing.json
      golden-submissions/
        spring.ioc.01/<expected files>           # pass case 입력
        spring.di.02/<expected files>
    sample-spring-with-lifecycle/
      pom.xml
      src/main/java/com/example/
        AppConfig.java                           # @Configuration + @Bean
        CacheWarmer.java                         # @Component + @PostConstruct/@PreDestroy
        MetricsPostProcessor.java                # BeanPostProcessor 구현
        UserService.java                         # @Service + @Autowired
      expected/
        ... (동일 구조, lifecycle.05 포함된 DAG)
      golden-submissions/
        spring.ioc.01/<expected files>
        spring.di.02/<expected files>
  helpers/
    snapshot-normalize.ts
    golden-compare.ts
  planning.test.ts                               # A
  exercises.test.ts                              # B
  quiz.test.ts                                   # C
  grade.test.ts                                  # D
  vitest.config.ts
```

> `sample-spring-core` fixture는 기존 `examples/sample-spring-project/`를 참조한다. 테스트 실행 시 `createFixtureCopy(<examples/...>)`로 temp dir 복사. `golden-submissions/`와 `expected/`만 `tests/eval/fixtures/sample-spring-core/` 아래에 신규 생성.

### 2.2 Normalizer

**파일:** `tests/eval/helpers/snapshot-normalize.ts`

```ts
interface NormalizeContext {
  repoRoot: string;   // fixture temp dir 절대 경로
}

function normalize(value: unknown, ctx: NormalizeContext): unknown;
```

재귀 방문하며:
- 문자열 안의 `ctx.repoRoot` → `<REPO_ROOT>`
- ISO timestamp 정규식(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`) → `<TIMESTAMP>`
- `os.tmpdir()` 및 `/tmp/` 접두 경로 → `<TMP>`
- Object key는 재귀 후 알파벳 순 정렬 (stable stringify)
- 배열 순서는 보존 (의미 있음)

알려지지 않은 비결정적 값을 놓치면 diff 디버깅이 어려우므로, 향후 strict mode로 "ISO-like 문자열이 감지됐는데 timestamp 필드가 아닌 경우" 경고 로그를 남기는 옵션 검토 (MVP에서는 미구현).

### 2.3 Golden Compare

**파일:** `tests/eval/helpers/golden-compare.ts`

```ts
function assertGoldenEquals(
  actual: unknown,
  goldenPath: string,
  ctx: NormalizeContext
): void;
```

동작:
1. `normalize(actual, ctx)`
2. `process.env.UPDATE_GOLDEN === "1"`이면: 정규화 결과를 goldenPath에 pretty-printed JSON으로 저장(디렉토리 없으면 mkdir -p). 끝.
3. goldenPath 부재 + UPDATE_GOLDEN 미설정: `throw new Error("No golden at <path>. Run 'UPDATE_GOLDEN=1 pnpm test:eval' to create.")`
4. goldenPath 읽어 parse → `expect(normalized).toEqual(golden)` (vitest assertion)

### 2.4 Test Execution Flow

각 `*.test.ts` 공통:

```ts
describe("<artifact family>", () => {
  for (const fixtureName of ["sample-spring-core", "sample-spring-with-lifecycle"]) {
    describe(fixtureName, () => {
      let repoDir: string;
      beforeAll(() => { repoDir = createFixtureCopy(<fixture source>); runOrchestrator(repoDir); });
      afterAll(() => { cleanupFixture(repoDir); });
      it("<artifact>", () => {
        const actual = readArtifact(repoDir, ...);
        assertGoldenEquals(actual, goldenPathFor(fixtureName, ...), { repoRoot: repoDir });
      });
    });
  }
});
```

- **planning.test.ts**: `run()` 후 `.study-agent/analysis.json`, `instantiated-dag.json`, `sessions.json` 비교
- **exercises.test.ts**: `run()` + 각 세션 `scaffold()` → `.study-agent/exercises/<id>/exercise-spec.json` + `starter/*` 파일 비교
- **quiz.test.ts**: `.study-agent/quiz/<id>/quiz.json` 비교
- **grade.test.ts**: 아래 §2.5

In-process `Orchestrator` 호출(기존 integration test 패턴). CLI subprocess 미사용.

### 2.5 Grade Snapshot Detail

현재 `apps/engine-cli/src/commands/grade.ts`는 expected artifact 존재 체크만 하므로 결정론적이며 sandbox 호출이 없다. Snapshot 가치를 확보하기 위해 두 경로 모두 커버:

1. **Pass case:** `golden-submissions/<sessionId>/`를 submissionPath로 gradeCommand 호출 → 결과를 `expected/grade/<sessionId>.passed.json`과 비교
2. **Fail case:** 테스트 안에서 임시 dir에 `golden-submissions/<sessionId>/`의 파일 중 일부를 누락시킨 상태로 복사 → submissionPath로 호출 → 결과를 `expected/grade/<sessionId>.failing.json`과 비교

Pass case는 `passed: true, score: 100`을, fail case는 partial score + 구체적 feedback 메시지를 고정. Feedback 문자열이 회귀하면 감지된다.

**Brittleness 방침 (중요):**
현재 grade 결과 JSON은 `passed`, `score`, `rubric[].passed`, `rubric[].message`, `feedback[]`, `nextAction`, `unlockedSessions` 등이 섞여 있다. 이 중 feedback 문자열은 표현 다듬기만으로도 diff가 크게 뜨는 brittle 영역이다. 3a 단계에서는 그대로 raw snapshot으로 둔다 (단일 source of truth 유지가 우선). 다만 pack/engine에서 feedback이 자주 다듬어지기 시작하면, 후속 작업으로 grade 결과에 **구조화 필드**(예: `feedbackCodes: string[]`, `missingArtifacts: string[]`)를 도입해 "의미 회귀"(코드/목록 diff)와 "표현 수정"(문자열 diff)을 분리할 수 있게 한다. 이 구조화 필드 도입은 3a 범위 밖이며, 필요 시점에 별도 작업으로 수행한다. 3a 문서는 이 확장 여지만 명시해 둔다.

### 2.6 Starter Golden Representation

Materialized starter 파일의 golden은 **raw text (Option A)**로 저장한다. JSON 래퍼는 쓰지 않는다.

**규칙:**
- `expected/exercises/<sessionId>/starter/<filename>` — 실제 파일명·확장자 그대로 저장 (예: `BeanDefinitionRegistry.java`). 파일 내용은 materialized 결과 그대로.
- 비교: `fs.readFileSync(actual, "utf-8") === fs.readFileSync(golden, "utf-8")` 수준의 문자열 직접 비교. normalizer는 적용하지 않는다 (starter 콘텐츠에는 repoRoot/timestamp가 정상적으로는 유입되지 않음; 유입되면 그게 버그).
- Update: `UPDATE_GOLDEN=1`일 때 actual 파일을 golden 경로로 그대로 복사.
- 파일 목록 자체의 변화는 `exercise-spec.json` golden의 `starterFiles` 필드에서 이미 잡히므로 별도 manifest 불필요.

**근거:**
- Raw text는 PR diff에서 Java/기타 코드가 자연스러운 syntax highlighting과 함께 리뷰됨 (JSON 래퍼로 감싸면 `\n` escape가 섞여 가독성 저하).
- 래퍼가 추가로 감지해주는 정보(path)는 golden 파일이 위치한 경로 자체가 이미 제공.
- 단점(여러 파일당 여러 assertion)은 테스트 루프로 간단히 처리 가능.

### 2.7 Vitest Integration

- `tests/eval/vitest.config.ts` 신규 생성 (vitest project 이름 `eval`)
- 루트 `vitest.workspace.ts`에 `tests/eval/vitest.config.ts` 추가
- 루트 `package.json`에 스크립트 추가:
  - `"test:eval": "vitest run --project eval"`
  - `"test:all": "vitest run"` (전체 project)
- 기본 `pnpm test`는 기존 unit + integration만 실행

---

## 3. Second Fixture: `sample-spring-with-lifecycle`

### 3.1 Purpose

Optional concept `spring.lifecycle.05`가 evidence threshold를 넘겨 instantiatedDAG에 포함되는 경로를 snapshot으로 고정한다. 기존 `sample-spring-core` fixture는 lifecycle annotation이 없어 이 경로를 커버하지 못한다.

### 3.2 Content

- `pom.xml`: Spring Context dependency
- `src/main/java/com/example/`:
  - `AppConfig.java` — `@Configuration` + `@Bean` 메서드 1~2개 (세션 1, 2 evidence)
  - `UserService.java` — `@Service` + `@Autowired` constructor (세션 4 evidence)
  - `CacheWarmer.java` — `@Component` + `@PostConstruct`, `@PreDestroy` (lifecycle.05 evidence)
  - `MetricsPostProcessor.java` — `implements BeanPostProcessor` (lifecycle.05 evidence 강화)

### 3.3 Expected Snapshot Differences (vs `sample-spring-core`)

- `instantiated-dag.json`의 `includedConcepts`에 `spring.lifecycle.05` 포함, `evidenceScore > threshold`
- `excludedConcepts`에는 `spring.aop.06` 잔존 (AOP evidence 없음)
- `sessions.json`: pack이 lifecycle.05에 대한 `buildSessions` 구현을 추가하기 전까지는 세션 목록에서 빠질 수 있다. 이 경우 "DAG 포함 + session 미생성"이 의도된 현재 상태로 golden에 박힌다. Slice 3b에서 세션 authoring이 추가되면 `UPDATE_GOLDEN=1`로 갱신한다.

### 3.4 Fixture README

각 fixture 디렉토리(`tests/eval/fixtures/<name>/`)에 짧은 `README.md`를 둔다. 내용:
- Fixture 의도 (어떤 경로를 커버하려 만들었는가)
- 현재 `expected/`에 박혀 있는 상태가 "의도된 현재 동작"임을 명시 (예: lifecycle fixture의 "sessions.json에 lifecycle.05가 아직 없는 상태")
- `expected/` 갱신 절차 (`UPDATE_GOLDEN=1 pnpm test:eval`)
- 기여자가 언제 이 fixture를 수정/추가해야 하는지

이는 future contributor가 snapshot diff를 볼 때 혼란을 줄인다.

### 3.5 Maintenance Cost

두 번째 fixture를 추가하면 세션 authoring(Part B) 및 pack 변경 시 두 fixture 모두 UPDATE_GOLDEN 필요하다. 각 fixture당 `golden-submissions/<sessionId>/`는 exercise의 expectedArtifacts 목록만 복붙 수준이라 수용 가능한 비용으로 본다.

---

## 4. Error Handling & CI

### 4.1 Error Handling

- Golden 파일 부재 + `UPDATE_GOLDEN` 미설정: 명확한 메시지로 fail (`"No golden at <path>. Run 'UPDATE_GOLDEN=1 pnpm test:eval' to create."`)
- Fixture temp dir 복사 실패: 기존 `createFixtureCopy` 에러 전파
- Orchestrator 실행 중 예외: snapshot 비교 전에 바로 fail, golden과 무관

### 4.2 CI

- CI 파이프라인에 `pnpm test:eval` 스텝 추가. Java/Gradle 불필요(순수 Node).
- `UPDATE_GOLDEN`은 로컬 전용 flag. CI에서 절대 set되면 안 된다 (의도치 않은 golden 덮어쓰기 방지).

---

## 5. Implementation Decomposition

이 harness 구현 순서:

1. **Helpers + 스캐폴딩**: `snapshot-normalize.ts`, `golden-compare.ts`, `tests/eval/` 디렉토리, `vitest.config.ts`, workspace 등록, `test:eval` 스크립트
2. **sample-spring-core fixture**: A/B/C/D 4개 test 파일 + `UPDATE_GOLDEN=1`로 최초 golden 생성 + 리뷰
3. **sample-spring-with-lifecycle fixture**: 신규 Spring 프로젝트 소스 + golden-submissions + expected golden 생성
4. **CI 통합 + README 문서화**: `pnpm test:eval` 실행법, golden update 절차, fixture 추가 가이드 간단 메모

---

## 6. Modified/Created Files Summary

| Action | Path |
|--------|------|
| Create | `tests/eval/helpers/snapshot-normalize.ts` |
| Create | `tests/eval/helpers/golden-compare.ts` |
| Create | `tests/eval/planning.test.ts` |
| Create | `tests/eval/exercises.test.ts` |
| Create | `tests/eval/quiz.test.ts` |
| Create | `tests/eval/grade.test.ts` |
| Create | `tests/eval/vitest.config.ts` |
| Create | `tests/eval/fixtures/sample-spring-core/README.md` |
| Create | `tests/eval/fixtures/sample-spring-core/golden-submissions/**` |
| Create | `tests/eval/fixtures/sample-spring-core/expected/**` |
| Create | `tests/eval/fixtures/sample-spring-with-lifecycle/README.md` |
| Create | `tests/eval/fixtures/sample-spring-with-lifecycle/pom.xml` |
| Create | `tests/eval/fixtures/sample-spring-with-lifecycle/src/**/*.java` |
| Create | `tests/eval/fixtures/sample-spring-with-lifecycle/golden-submissions/**` |
| Create | `tests/eval/fixtures/sample-spring-with-lifecycle/expected/**` |
| Modify | `vitest.workspace.ts` — add `tests/eval/vitest.config.ts` |
| Modify | `package.json` (root) — add `test:eval`, `test:all` scripts |
| Modify | CI config (있다면) — add `pnpm test:eval` step |

---

## 7. Next Slice

Slice 3b (세션 3~6 authoring): 이 harness 위에서 진행. 각 세션 추가 시 snapshot diff로 의도된 변화만 반영됐는지 확인하며 `UPDATE_GOLDEN=1`로 갱신.
