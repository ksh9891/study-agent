# Slice 3b — Sessions 3 & 4 Authoring (di-03, di-04)

**Date:** 2026-04-13
**Status:** Approved design
**Predecessors:** Slice 2 (unlock transition), Slice 3a (eval harness)
**Successor candidate:** Slice 3c — lifecycle-05 / aop-06 authoring (optional)

## 1. 목표와 범위

MVP 1.0 완료 이후 남아있는 authoring work 중 **core/required 세션 2개**를 완성해 학습자가 `spring.ioc.01 → spring.di.02 → spring.di.03 → spring.di.04`까지 끊김 없이 관통할 수 있게 한다.

**In scope**
- `spring.di.03` — Bean Creation and Singleton Registry
- `spring.di.04` — Constructor-Based DI Resolution

**Out of scope (다음 slice 3c로 연기)**
- `spring.lifecycle.05` — Lifecycle Hooks and Post Processors
- `spring.aop.06` — Proxy and AOP Basics

두 세션 모두 canonical DAG (`packages/pack-spring-core/concept-dag/spring-core-dag.json`)에 이미 노드/엣지로 존재한다. 이번 slice는 순수 authoring + registry 확장이며, 엔진 내부 로직 변경은 없다.

## 2. 비-목표

- Canonical DAG 수정 (node, edge, evidence rule 변경 없음)
- `session-builder`, `evaluator`, `dag-instantiator` 등 엔진 코어 수정
- 신규 eval fixture 추가 — 기존 두 fixture로 충분
- Three-level singleton cache, circular dependency resolution, prototype scope 실제 구현 (개념만 quiz에 등장)

## 3. Exercise 설계

### 3.1 `spring.di.03` — SingletonBeanRegistry

**학습 목표.** BeanDefinition(metadata) 단계에서 실제 인스턴스 생성 단계로 넘어가며, 두 번째 `getBean` 호출이 새 객체를 만들지 않고 캐시된 singleton을 반환하는 매커니즘을 구현한다.

**Exercise bundle:** `packages/pack-spring-core/exercises/di-03-singleton-registry/`

**Starter files (`.java.tmpl`)**
- `BeanDefinition.java.tmpl` — 학습자 단순화 버전 (name, beanClass)
- `SingletonBeanRegistry.java.tmpl` — `getSingleton(name)`, `registerSingleton(name, obj)`, `containsSingleton(name)` 스펙만
- `BeanFactory.java.tmpl` — `registerBeanDefinition`, `getBean(name)` — 최초 호출 시 reflection으로 instantiate 후 registry에 저장
- `README.md` — 과제 설명

**Hidden tests** (`hidden-tests/SingletonRegistryTest.java`)
- `testFirstGetBeanCreatesInstance` — `getBean("foo")`가 not-null
- `testSubsequentGetBeanReturnsSameInstance` — 두 번 호출 시 `assertSame`
- `testUnregisteredBeanThrows` — 미등록 bean name 예외
- `testIndependentBeanSlots` — 서로 다른 두 bean 등록 시 독립 저장

**Template variables:** `packageName=com.studyagent.exercise` (기존 패턴 준수)

**Key simplification.** Spring 실제 `DefaultSingletonBeanRegistry`의 3-level cache는 다루지 않는다. 단일 Map 수준으로 충분.

### 3.2 `spring.di.04` — ConstructorResolver

**학습 목표.** 의존성 있는 bean을 등록했을 때, 엔진이 생성자 파라미터의 **타입**을 보고 필요한 다른 bean을 주입(inject)한 후 인스턴스를 만드는 과정을 구현한다. 의존 bean이 아직 인스턴스화되지 않았으면 **등록된 BeanDefinition을 통해 재귀적으로 생성**한다 (즉, `BeanFactory.getBean(name)` 이 내부적으로 ConstructorResolver → 다시 `getBean(depName)` 을 호출하는 구조).

**Assumption.** 이 exercise는 **동일 타입당 단일 bean 등록**만 가정한다. 동일 타입 다중 bean에 대한 qualifier/primary 처리는 non-goal (실제 Spring의 `@Qualifier`, `@Primary`는 이 slice 범위 밖).

**Exercise bundle:** `packages/pack-spring-core/exercises/di-04-constructor-di/`

**Starter files (`.java.tmpl`)**
- `BeanDefinition.java.tmpl` — di-03과 동일 수준(독립 복사)
- `BeanFactory.java.tmpl` — di-03 구현에서 확장. `getBean` 이 생성 전 `ConstructorResolver.resolveDependencies`를 호출하도록 스텁
- `ConstructorResolver.java.tmpl` — 핵심. `getDeclaredConstructors()[0]`, 파라미터 타입별로 **`BeanFactory.getBean(typeToName)` 재호출**(미인스턴스 상태라면 재귀 생성), `newInstance(args)` 호출
- `README.md`

**Hidden tests** (`hidden-tests/ConstructorResolverTest.java`)
- `testZeroArgBean` — 의존성 없는 bean 인스턴스화
- `testSingleDependency` — `A(B b)` → B 먼저, A가 B 참조 보유
- `testChainedDependency` — `A(B b), B(C c)` 세 BeanDefinition만 등록된 상태에서 `getBean("A")` 호출 → 재귀 resolve로 C → B → A 순 생성, `A.b.c != null` 검증
- `testUnresolvedDependencyThrows` — A만 등록되고 의존 B의 BeanDefinition 자체가 없는 상태에서 `getBean("A")` 요청 시 예외

**Template variables:** `packageName=com.studyagent.exercise`

**Starter guidance.** Hidden test의 reflection instantiation이 `IllegalAccessException` 나지 않도록 starter 코멘트에서 `public` 생성자를 명시하고, 레퍼런스 구현은 `setAccessible(true)`를 기본으로 사용한다.

### 3.3 Starter 독립성 원칙

di-03과 di-04는 개념적으로 연속되지만 **starter/hidden-test는 독립 복사**로 간다. 세션 간 파일 공유는 채점 격리(repoDir 복사 + temp workspace)를 깨뜨리고, 이전 세션 실패가 현재 세션을 오염시킨다. 약간의 중복은 감수한다.

## 4. Quiz 설계

기존 pattern 유지: **graded 4문항 (각 weight 25, 총 100) + reflection 1문항, passingScore 60.** 세션별로 MCQ/short_answer 혼합 2+2 패턴을 기본 target으로 하되, 개별 문항이 MCQ로 더 명확히 채점 가능하면 비율을 조정한다 (deterministic grading이 mix ratio보다 우선).

### 4.1 `quiz-di-03`

**Graded**
- q1 (MCQ): "Spring이 singleton bean을 재생성하지 않도록 보장하는 자료구조는?" → ConcurrentHashMap 기반 singleton map
- q2 (MCQ): "BeanDefinition과 singleton instance를 분리해서 관리하는 가장 직접적인 이득은?" → 선택지:
  - A) 컴파일 에러를 조기에 잡을 수 있다
  - B) bean을 실제로 필요할 때까지 생성을 지연할 수 있다 (lazy instantiation)
  - C) bean 이름을 중복 등록할 수 있다
  - D) JVM 메모리를 덜 사용한다
  정답: B
- q3 (short): "같은 이름으로 `getBean("foo")` 를 두 번 호출했을 때 Spring의 기본 scope에서 돌려받는 두 객체의 관계를 한 단어로: ___" → same (alias: identical, 동일)
- q4 (short): "같은 bean을 매번 새 인스턴스로 받으려면 어떤 scope를 지정?" → prototype

**Reflection**
- r1: "왜 Spring은 단순 `new`가 아니라 singleton registry로 bean을 관리하나?"

### 4.2 `quiz-di-04`

**Graded**
- q1 (MCQ): "생성자 기반 DI에서 Spring이 파라미터를 resolve하는 기준은?" → 파라미터 타입으로 registry lookup
- q2 (short): "Class 객체에서 생성자 목록을 얻는 reflection API 이름은?" → getDeclaredConstructors
- q3 (MCQ): "생성자 DI가 setter DI 대비 갖는 주요 장점은?" → 불변성 / 필수 의존성 컴파일타임 보장
- q4 (short): "A가 B를 생성자 주입받고 B가 C를 주입받을 때, 인스턴스 생성 순서는 (C/B/A 순서대로)?" → C → B → A (또는 C, B, A)

**Reflection**
- r1: "circular dependency가 생성자 DI에서만 즉시 터지고 field/setter DI에서는 런타임 지연되는 이유?"

### 4.3 Normalization & Answer key

기존 `normalizationRules`(case_insensitive + trim_whitespace) 유지. short_answer 문항은 허용 variant가 있는 경우 `alias` rule을 써서 의미 동등한 답을 커버 (예: "C → B → A", "C, B, A", "C B A").

## 5. Engine / Pack 레지스트리 변경

### 5.1 `packages/pack-spring-core/src/exercise-builder.ts`

```
SESSION_TO_EXERCISE:
  + "spring.di.03": "di-03-singleton-registry"
  + "spring.di.04": "di-04-constructor-di"

hiddenTestFiles:
  + "di-03-singleton-registry": ["SingletonRegistryTest.java"]
  + "di-04-constructor-di":     ["ConstructorResolverTest.java"]
```

### 5.2 `packages/pack-spring-core/src/quiz-builder.ts`

`QUIZ_SPECS` inline map에 `spring.di.03`, `spring.di.04` 엔트리 추가. YAML (`packages/pack-spring-core/quiz/di-03-*.yaml`, `di-04-*.yaml`) 도 함께 추가한다.

**Source-of-truth 규약 (이 slice 기준 명시):**
- **Runtime source of truth = `quiz-builder.ts` inline map.** 실제 로딩·채점은 inline map만 사용.
- **YAML = authoring reference.** 사람이 읽기 쉬운 authoring 문서이며, inline map과의 동기화는 수기 책임.
- Drift 방지: inline map 수정 시 동일 세션 YAML도 같은 PR에서 수정하는 것을 규약으로 한다. 장기적으로는 YAML runtime parsing으로 일원화 (slice 3c 이후 과제).

### 5.3 변경 없음 확인

- `concept-dag/spring-core-dag.json` — 변경 없음
- `session-builder.ts`, `evaluator.ts`, `dag-instantiator.ts` — 변경 없음
- `adapter-java`, `engine-core`, `engine-cli` — 변경 없음

## 6. Eval harness 변경

### 6.1 `tests/eval/helpers/fixtures-list.ts`

```
AUTHORED_SESSIONS = [
  "spring.ioc.01",
  "spring.di.02",
+ "spring.di.03",
+ "spring.di.04",
] as const
```

### 6.2 Fixture

- `sample-spring-core`, `sample-spring-with-lifecycle` 둘 다 `@Autowired`/`@Service`/`@Component` 포함 → di-03 (Singleton), di-04 (Constructor DI) evidence 충분
- **신규 fixture 추가 없음**

### 6.3 Golden 파일 갱신

```
UPDATE_GOLDEN=1 pnpm test:eval
```

실행 시 다음 golden 파일들이 생성/갱신된다:
- `tests/eval/fixtures/<fixture>/expected/exercises/spring.di.03/exercise-spec.json`
- `tests/eval/fixtures/<fixture>/expected/exercises/spring.di.03/starter/*.java`
- `tests/eval/fixtures/<fixture>/expected/exercises/spring.di.04/exercise-spec.json`
- `tests/eval/fixtures/<fixture>/expected/exercises/spring.di.04/starter/*.java`
- `tests/eval/fixtures/<fixture>/expected/quiz/spring.di.03.json`
- `tests/eval/fixtures/<fixture>/expected/quiz/spring.di.04.json`
- 관련 planning/grade snapshot (두 세션이 authoring 완료로 분류되며 snapshot shape 변화 시)

`UPDATE_GOLDEN=1` 실행 후 **반드시 `git diff` 수기 리뷰**. CI는 set하지 않는다.

## 7. 작업 순서 & 커밋 단위

단일 PR(feature branch `feature/slice-3b-sessions-3-4`), 커밋은 레이어별로 분리해 리뷰 용이성 확보:

1. `exercises/di-03-singleton-registry/` bundle 추가 (yaml + starter + hidden-tests)
2. `exercises/di-04-constructor-di/` bundle 추가
3. `quiz/di-03-*.yaml`, `quiz/di-04-*.yaml` + `quiz-builder.ts` inline 엔트리 추가
4. `exercise-builder.ts` `SESSION_TO_EXERCISE` + `hiddenTestFiles` 확장
5. `fixtures-list.ts` `AUTHORED_SESSIONS` 확장 + `UPDATE_GOLDEN=1 pnpm test:eval` 결과 golden 추가
6. `agent_docs/mvp-roadmap.md` slice 3b 상태 업데이트 (⏳ → ✅), `CLAUDE.md` 진행 상황 줄 갱신

## 8. 완료 기준 (DoD)

- [ ] `pnpm test` (unit + integration) 통과
- [ ] `pnpm test:eval` 통과 (golden 일치)
- [ ] `pnpm build` 성공 (workspace 전체)
- [ ] `spring.ioc.01`, `spring.di.02`, `spring.di.03`, `spring.di.04` 네 세션 모두 `run → exercise → grade → quiz → grade-quiz → progress` 관통
- [ ] `spring.di.02 passed` → `spring.di.03 locked → available`, `spring.di.03 passed` → `spring.di.04 locked → available` unlock transition 수동 검증
- [ ] Private artifact (hidden tests, answerKey) 가 `.study-agent/` 아래 공개 디렉터리로 새지 않음
- [ ] **Eval golden diff 수기 리뷰 완료** (`UPDATE_GOLDEN=1` 실행 후 `git diff` 전부 확인, 의도치 않은 broad snapshot churn 없음을 PR description에 명시)
- [ ] `agent_docs/mvp-roadmap.md`, `CLAUDE.md` 갱신

## 9. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| Reflection `newInstance` 에서 `IllegalAccessException` | starter 주석에 `public` 생성자 명시, 레퍼런스는 `setAccessible(true)` |
| di-03 → di-04 starter 중복이 drift 유발 | 독립 복사 원칙 문서화, 변경 시 둘 다 수정하는 체크리스트 |
| `UPDATE_GOLDEN` 산출물에 의도치 않은 diff | 커밋 전 `git diff --stat` + 스냅샷 샘플링 리뷰, PR description에 갱신 범위 명시 |
| Short-answer 문항의 허용 variant 누락으로 채점 거짓 음성 | normalization `alias` rule 에 자연스러운 동의 표현 사전 등록, 테스트 세션 수동 1회 |

## 10. 확장 경로 (non-goal for this slice)

- Slice 3c: `spring.lifecycle.05`, `spring.aop.06` 동일 pattern으로 authoring (optional/advanced 세션)
- Quiz inline map → YAML runtime parsing 일원화 (현재 이중화 부담 제거)
- Starter 중복을 방지하는 shared template inheritance (세션 간 독립성 원칙과 충돌 — 신중 검토)
