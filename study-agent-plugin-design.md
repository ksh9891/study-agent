# 스터디에이전트 플러그인 아키텍처 설계서

## 1. 문서 목적

이 문서는 **코드베이스를 학습 가능한 커리큘럼으로 변환하는 오픈소스 프로그램, `Study Agent`** 의 초기 설계를 정리한 문서다.  
목표는 Claude Code가 이 문서를 바탕으로 바로 구현을 시작할 수 있도록, 다음 내용을 명확히 정의하는 것이다.

- 제품 목표와 범위
- 시스템 아키텍처
- 플러그인 구조
- 핵심 도메인 모델
- 런타임 흐름
- MVP 범위
- 모노레포 구조
- 단계별 구현 계획

---

## 2. 제품 정의

### 2.1 한 줄 정의

`Study Agent` 는 사용자가 제공한 소스코드를 분석하여, 핵심 개념을 추출하고, 이를 **step-by-step 학습 세션** 으로 변환한 뒤, 각 세션마다 **코드 근거 설명 → 미니 구현 실습 → 자동 평가 → 개념 퀴즈** 를 제공하는 학습 에이전트다.

### 2.2 문제 정의

사용자는 오픈소스나 프레임워크 코드를 읽을 때 다음과 같은 문제를 겪는다.

- 어디부터 읽어야 할지 모른다.
- 파일은 읽었지만 설계 의도를 이해하지 못한다.
- 이해했다고 느껴도 직접 구현은 못 한다.
- 다음 날 다시 보면 처음부터 길을 잃는다.

`Study Agent` 는 이 문제를 해결하기 위해, 단순 코드 요약이 아니라 **이해를 증명하게 만드는 학습 루프** 를 제공해야 한다.

### 2.3 핵심 가치

- 큰 코드베이스를 **학습 경로** 로 압축한다.
- 설명을 항상 **실제 코드 근거** 와 연결한다.
- 사용자가 핵심 원리를 **직접 재구현** 해보게 만든다.
- 테스트와 퀴즈를 통해 **이해 완료 여부** 를 판정한다.

---

## 3. 제품 목표와 비목표

### 3.1 목표

1. 사용자가 repo 하나를 넣으면 학습 가능한 세션 목록이 자동 생성된다.
2. 각 세션은 코드 근거 설명, 실습, 퀴즈를 포함한다.
3. 사용자는 세션을 순차적으로 수행하면서 개념을 숙지한다.
4. 플러그인 구조를 통해 언어/프레임워크별 학습팩을 확장할 수 있다.
5. 초기 오픈소스 형태로 외부 기여가 가능한 구조를 갖춘다.

### 3.2 비목표

다음은 초기 MVP 범위에서 제외한다.

- 모든 언어/프레임워크를 높은 품질로 지원
- 완전한 GUI 제품
- 멀티유저 협업 학습
- 음성 튜터 기능
- 고급 시각화 대시보드
- 분산 시스템 전체를 실제 런타임 수준으로 시뮬레이션하는 기능

---

## 4. 핵심 설계 원칙

### 4.1 범용 코어, 수직적 학습팩

제품 비전은 범용이지만, 학습 품질은 도메인별로 달라진다.  
따라서 코어는 범용으로 설계하고, 특정 스택의 학습 품질은 플러그인 형태의 `Study Pack` 이 담당한다.

### 4.2 파일 요약이 아니라 메커니즘 학습

학습 단위는 파일이 아니라 **개념/메커니즘** 이어야 한다.

예시:

- Spring: BeanDefinition, DI Resolution, Bean Lifecycle, Proxy/AOP
- Kafka: Partition, Consumer Group, Offset, Rebalance
- JPA: Persistence Context, Dirty Checking, Flush

### 4.3 설명은 코드에 anchored 되어야 한다

모든 설명은 반드시 실제 코드 위치와 연결되어야 한다.

예시:

- 어떤 클래스가 어떤 역할을 하는지
- 어느 메서드가 흐름을 시작하는지
- 어떤 인터페이스/확장 포인트가 개입하는지

### 4.4 이해 완료는 증거 기반으로 판정한다

다음 세션으로 넘어가는 조건은 “설명을 읽었다”가 아니라 다음을 만족해야 한다.

- 실습 코드가 hidden test 를 통과한다.
- 개념 퀴즈를 일정 기준 이상 맞힌다.
- 필요한 경우 짧은 설명형 질문도 통과한다.

### 4.5 오픈소스 친화적 구조

외부 기여자가 언어 플러그인 또는 학습팩 플러그인을 독립적으로 만들 수 있어야 한다.

---

## 5. 사용자 시나리오

### 5.1 기본 사용자 흐름

1. 사용자가 학습하고 싶은 repo 를 clone 하거나 경로를 전달한다.
2. `Study Agent` 가 repo 를 분석한다.
3. 해당 repo 에 적합한 언어 플러그인과 학습팩 플러그인을 선택한다.
4. 커리큘럼과 세션 목록을 생성한다.
5. 사용자는 각 세션에서 설명을 읽고 실습을 수행한다.
6. 자동 평가와 퀴즈를 통과하면 다음 세션으로 진행한다.
7. 최종적으로 사용자는 핵심 메커니즘을 재구현 가능한 수준까지 이해하게 된다.

### 5.2 예시

#### Spring Core 학습

- DI가 어떻게 구현되는지
- Bean 정의와 Bean 인스턴스가 왜 분리되는지
- Lifecycle 이 어디서 개입하는지
- 왜 Proxy 가 필요한지

#### JPA 학습

- Persistence Context 의 역할
- Dirty Checking 의 동작 원리
- Flush 와 Commit 의 차이
- Entity 상태 전이

---

## 6. 전체 시스템 개요

초기 설계 기준으로 `Study Agent` 는 아래 컴포넌트로 구성한다.

1. **CLI / Entry App**
2. **Core Engine**
3. **Plugin Registry**
4. **Language Plugins**
5. **Study Pack Plugins**
6. **Workspace / Sandbox Runner**
7. **Progress Store**

### 6.1 구조 개요

```text
User Repo
  -> Core Engine
      -> Plugin Registry
          -> Language Plugin
          -> Study Pack Plugin
      -> Curriculum Builder
      -> Session Runner
      -> Practice Runner
      -> Evaluator
      -> Progress Store
```

---

## 7. 플러그인 전략

## 7.1 왜 플러그인 구조인가

모든 언어/프레임워크에 대해 하나의 범용 규칙만으로 좋은 학습을 만들기 어렵다.  
따라서 코어는 공통 실행기 역할만 맡고, 실제 학습 도메인 지식은 플러그인으로 분리한다.

## 7.2 초기 버전의 플러그인 종류

초기 버전은 복잡도를 낮추기 위해 플러그인 종류를 두 가지로 제한한다.

### A. Language Plugin

역할:

- 언어/빌드 시스템 감지
- AST/심볼/참조 구조 생성
- import/call/dependency graph 생성
- 테스트 실행 방법 제공

예시:

- `plugin-java`
- `plugin-typescript`
- `plugin-python`

### B. Study Pack Plugin

역할:

- repo 에 어떤 개념을 가르칠지 결정
- concept graph 생성
- 세션 생성
- 실습 문제 생성
- 퀴즈 생성
- 제출물 평가

예시:

- `pack-spring-core`
- `pack-jpa-hibernate`
- `pack-kafka-core`
- `pack-react-fundamentals`

## 7.3 미래 확장 구조

초기 버전에서는 `Study Pack Plugin` 하나에 여러 책임을 넣되, 향후 필요하면 다음처럼 더 세분화할 수 있다.

- Concept Plugin
- Exercise Plugin
- Evaluator Plugin

하지만 MVP 에서는 과도한 분리보다 구현 단순성이 더 중요하다.

---

## 8. 플러그인 계약(Contract)

아래 인터페이스는 TypeScript 기준의 초안이다.

### 8.1 공통 타입

```ts
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  kind: "language" | "study-pack";
  supports?: string[];
}
```

### 8.2 Language Plugin 인터페이스

```ts
export interface LanguagePlugin {
  manifest: PluginManifest;

  detect(repo: RepoContext): Promise<LanguageDetectResult | null>;

  buildCodeModel(input: {
    repo: RepoContext;
    workspace: WorkspaceContext;
  }): Promise<CodeModel>;

  runTests?(input: {
    repo: RepoContext;
    workspace: WorkspaceContext;
    targetPath?: string;
  }): Promise<TestRunResult>;
}
```

### 8.3 Study Pack Plugin 인터페이스

```ts
export interface StudyPackPlugin {
  manifest: PluginManifest;

  detect(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    language: LanguageDetectResult;
  }): Promise<PackMatchResult | null>;

  buildConceptGraph(input: {
    repo: RepoContext;
    codeModel: CodeModel;
  }): Promise<ConceptGraph>;

  buildSessions(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    conceptGraph: ConceptGraph;
  }): Promise<StudySession[]>;

  generateExercise(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySession;
    workspace: WorkspaceContext;
  }): Promise<Exercise | null>;

  generateQuiz(input: {
    session: StudySession;
    exercise?: Exercise | null;
  }): Promise<Quiz | null>;

  evaluateSubmission(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySession;
    workspace: WorkspaceContext;
    submissionPath: string;
  }): Promise<EvaluationResult>;
}
```

---

## 9. 핵심 도메인 모델

### 9.1 RepoContext

```ts
export interface RepoContext {
  rootPath: string;
  repoName: string;
  vcs?: {
    type: "git";
    branch?: string;
    commit?: string;
    remoteUrl?: string;
  };
}
```

### 9.2 CodeModel

`Language Plugin` 이 생성하는 언어 중립적인 분석 결과다.

```ts
export interface CodeModel {
  language: string;
  files: CodeFile[];
  symbols: SymbolNode[];
  references: ReferenceEdge[];
  callGraph?: CallEdge[];
  dependencyGraph?: DependencyEdge[];
  metadata?: Record<string, unknown>;
}
```

### 9.3 ConceptGraph

학습해야 할 개념 노드와 선행관계를 표현한다.

```ts
export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface ConceptNode {
  id: string;
  title: string;
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  evidence: CodeEvidence[];
  tags?: string[];
}
```

### 9.4 StudySession

실제 사용자에게 보여줄 학습 세션이다.

```ts
export interface StudySession {
  id: string;
  conceptId: string;
  title: string;
  learningGoals: string[];
  explanation: SectionBlock[];
  evidence: CodeEvidence[];
  prerequisites?: string[];
  unlockRule?: UnlockRule;
}
```

### 9.5 Exercise

```ts
export interface Exercise {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  starterFiles: StarterFile[];
  expectedArtifacts: string[];
  hints?: string[];
}
```

### 9.6 Quiz

```ts
export interface Quiz {
  id: string;
  sessionId: string;
  questions: QuizQuestion[];
  passingScore: number;
}
```

### 9.7 EvaluationResult

```ts
export interface EvaluationResult {
  passed: boolean;
  score: number;
  rubric: RubricItemResult[];
  feedback: string[];
  nextAction?: "retry" | "review" | "advance";
}
```

---

## 10. 런타임 흐름

## 10.1 분석 단계

1. 사용자가 repo 경로를 입력한다.
2. 코어가 repo 메타데이터를 읽는다.
3. 등록된 `Language Plugin` 들이 `detect()` 를 수행한다.
4. 가장 높은 적합도의 언어 플러그인을 선택한다.
5. 해당 플러그인이 `CodeModel` 을 생성한다.
6. 등록된 `Study Pack Plugin` 들이 `detect()` 를 수행한다.
7. 가장 높은 적합도의 학습팩을 선택한다.
8. 학습팩이 `ConceptGraph` 와 `StudySession[]` 을 생성한다.

## 10.2 학습 단계

1. 사용자가 세션 하나를 선택한다.
2. 에이전트가 설명과 코드 근거를 보여준다.
3. 실습이 있으면 `generateExercise()` 를 호출한다.
4. 사용자가 구현을 제출한다.
5. `evaluateSubmission()` 으로 자동 평가한다.
6. `generateQuiz()` 또는 별도 퀴즈 채점으로 개념 이해도를 확인한다.
7. 통과 시 다음 세션 unlock.

---

## 11. 플러그인 로딩 방식

## 11.1 플러그인 설치 방식

초기에는 Node.js/TypeScript 기반 CLI 를 전제로, 플러그인을 npm 패키지 또는 로컬 경로로 로딩한다.

예시:

```yaml
plugins:
  - "@study-agent/plugin-java"
  - "@study-agent/pack-spring-core"
```

또는

```yaml
plugins:
  - "./plugins/plugin-java"
  - "./plugins/pack-spring-core"
```

## 11.2 설정 파일 예시

```yaml
workspace:
  root: .study-agent

plugins:
  - "@study-agent/plugin-java"
  - "@study-agent/pack-spring-core"

learning:
  mode: guided
  requireQuizPass: true
  requireExercisePass: true
```

## 11.3 로딩 순서

1. 설정 파일을 읽는다.
2. 플러그인 모듈을 `import()` 한다.
3. `manifest` 를 검증한다.
4. kind 에 따라 registry 에 등록한다.
5. 실행 시 detection score 에 따라 적합한 플러그인을 선택한다.

---

## 12. 추천 모노레포 구조

초기 오픈소스 구조는 `pnpm workspace + TypeScript` 를 권장한다.

```text
study-agent/
  apps/
    cli/
  packages/
    core/
    sdk/
    shared/
    plugin-java/
    pack-spring-core/
    sandbox-runner/
    progress-store/
  examples/
    sample-spring-project/
  docs/
    architecture/
    plugins/
  tests/
    integration/
    fixtures/
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
```

### 12.1 각 패키지 역할

#### `apps/cli`

- CLI 엔트리포인트
- repo 분석 명령
- 세션 실행 명령
- 평가 명령

#### `packages/core`

- Plugin Registry
- Orchestrator
- Session Runner
- Curriculum Builder
- 공통 도메인 로직

#### `packages/sdk`

- 플러그인 작성용 public interface
- manifest 타입
- helper util

#### `packages/shared`

- 공통 타입
- logger
- config loader
- error model

#### `packages/plugin-java`

- Java repo detect
- CodeModel 생성
- 테스트 실행 연동(gradle/maven)

#### `packages/pack-spring-core`

- Spring Core detect
- ConceptGraph 생성
- Session 생성
- Exercise / Quiz / Evaluation 생성

#### `packages/sandbox-runner`

- 실습 파일 생성
- 임시 workspace 구성
- 테스트/컴파일 실행

#### `packages/progress-store`

- 사용자 진도 저장
- 세션 상태 관리
- unlock 판단용 저장소

---

## 13. 권장 CLI UX

### 13.1 기본 명령

```bash
study-agent analyze ./spring-framework
study-agent sessions ./spring-framework
study-agent start ./spring-framework --session spring.di.01
study-agent submit ./spring-framework --session spring.di.01 --path ./solutions/session1
study-agent progress ./spring-framework
```

### 13.2 기대 결과

#### `analyze`

- 감지된 언어 플러그인
- 감지된 학습팩
- 생성된 개념 수
- 생성된 세션 수

#### `sessions`

- 세션 목록
- 잠금/해제 상태
- 난이도

#### `start`

- 학습 목표
- 코드 근거
- 단계 설명
- 실습 안내
- 퀴즈 준비 여부

#### `submit`

- 테스트 결과
- 퀴즈 결과
- 통과/실패 여부
- 피드백

---

## 14. 초기 구현 범위(MVP)

## 14.1 기술 선택

- Language: TypeScript
- Runtime: Node.js
- Package Manager: pnpm
- Test Runner: Vitest 또는 Jest
- CLI: Commander 또는 yargs
- Parsing:
  - Java: Tree-sitter 또는 Java parser 연동 후보
  - 초기엔 최소 기능부터 시작 가능

## 14.2 지원 범위

### 포함

- 로컬 repo 입력
- Java language plugin
- Spring Core study pack
- 개념 그래프 생성
- 5~8개 세션 생성
- 세션 설명 출력
- 미니 실습 생성
- hidden test 기반 평가
- 퀴즈 기반 개념 검증
- 진도 저장

### 제외

- 웹 UI
- 멀티 repo 비교
- 고급 그래프 시각화
- 협업 기능
- 원격 실행 인프라
- 다중 언어 동시 지원

## 14.3 Spring Core 예시 세션

1. IoC 와 Bean Metadata
2. Bean 등록과 BeanDefinition
3. Bean 생성과 Singleton Registry
4. 생성자 기반 DI Resolution
5. Lifecycle Hook 과 Post Processor
6. Proxy / AOP 의 필요성

---

## 15. Study Pack 설계 가이드

`Study Pack Plugin` 은 단순 요약기가 아니라, 다음 항목을 포함해야 한다.

### 15.1 detect 규칙

예: Spring Core pack

- `@Component`, `@Bean`, `ApplicationContext`, `BeanFactory` 존재 여부
- `spring-context`, `spring-beans` 의존성 유무
- 특정 패키지명/클래스명 시그널

### 15.2 concept graph 규칙

개념을 다음 기준으로 나눈다.

- 메커니즘 중심인지
- 선행 개념이 있는지
- 실습으로 축소 가능한지
- 오개념이 자주 발생하는지

### 15.3 session 생성 규칙

각 세션은 아래를 포함해야 한다.

- 제목
- 학습 목표
- 코드 근거 목록
- 단계별 설명 블록
- 실습 여부
- 퀴즈 여부
- 통과 기준

### 15.4 exercise 생성 규칙

실습은 원본 코드를 그대로 따라치게 하면 안 된다.  
반드시 핵심 원리만 남긴 축소판 재구현이어야 한다.

예:

- mini DI container
- simple bean registry
- toy post processor hook

### 15.5 evaluation 규칙

평가 기준은 최소 다음 3개 축을 갖는다.

- 실행 성공 여부
- hidden test 통과 여부
- 개념 퀴즈 통과 여부

---

## 16. 내부 품질 검증용 Eval Harness

오픈소스라고 해도, `Study Agent` 자체의 품질을 검증하는 내부 eval harness 가 필요하다.

### 16.1 목적

- 플러그인 변경 시 회귀 검증
- 설명 품질 저하 감지
- 세션 생성 오류 감지
- 실습 난이도 붕괴 감지

### 16.2 최소 구성

- golden repo fixture
- expected concept graph snapshot
- expected session count
- exercise 생성 snapshot
- hidden test pass/fail fixture
- sample quiz answers

### 16.3 권장 테스트 종류

- unit test: registry, loader, config
- integration test: analyze → sessions → exercise → submit 전체 흐름
- snapshot test: concept graph/session output
- regression test: plugin 변경 전후 결과 비교

---

## 17. 진도 및 잠금 해제 규칙

초기엔 아주 단순한 mastery model 로 시작한다.

### 17.1 세션 상태

- `locked`
- `available`
- `in_progress`
- `passed`
- `failed`

### 17.2 통과 규칙 예시

- exercise required 인 경우: hidden test 통과
- quiz required 인 경우: passing score 이상
- 둘 다 required 인 경우: 둘 다 만족해야 `passed`

### 17.3 저장 예시

```json
{
  "repo": "spring-framework",
  "pack": "@study-agent/pack-spring-core",
  "sessions": {
    "spring.di.01": {
      "status": "passed",
      "score": 92
    },
    "spring.di.02": {
      "status": "available"
    }
  }
}
```

---

## 18. 구현 순서 제안

Claude Code 에게 한 번에 모든 기능을 시키기보다, 아래 단계로 나눠서 개발하는 것이 좋다.

### Phase 1. Core skeleton

목표:

- CLI 실행 가능
- config 로더
- plugin registry
- plugin manifest 검증
- 기본 로깅

완료 조건:

- 로컬 플러그인 2개를 등록해 앱이 실행된다.

### Phase 2. Language plugin contract

목표:

- `LanguagePlugin` 인터페이스 확정
- `plugin-java` 기본 detect 구현
- 매우 단순한 CodeModel 생성

완료 조건:

- Java repo 분석 시 Java plugin 이 선택된다.

### Phase 3. Study pack contract

목표:

- `StudyPackPlugin` 인터페이스 확정
- `pack-spring-core` detect 구현
- 하드코딩 기반 concept/session 생성부터 시작

완료 조건:

- Spring repo 에서 기본 세션 목록이 생성된다.

### Phase 4. Session runner

목표:

- 세션 출력
- explanation/evidence 렌더링
- 실습 scaffold 생성

완료 조건:

- 사용자가 session 시작 후 starter files 를 받을 수 있다.

### Phase 5. Evaluation flow

목표:

- hidden test 실행
- 결과 수집
- 퀴즈 채점
- pass/fail 저장

완료 조건:

- submit → pass/fail → progress update 가 동작한다.

### Phase 6. Internal eval harness

목표:

- integration fixture 추가
- snapshot baseline 추가
- 회귀 테스트 자동화

완료 조건:

- 주요 흐름 변경 시 테스트로 품질 저하를 감지할 수 있다.

---

## 19. 오픈소스 운영 전략

### 19.1 초기 메시지

프로젝트의 메시지는 다음이 적절하다.

> Study Agent is an open-source learning harness that turns a codebase into a structured study program with explanation, practice, and mastery checks.

### 19.2 기여 방향

초기에는 다음 형태의 기여를 유도한다.

- 새로운 Language Plugin
- 새로운 Study Pack Plugin
- 새로운 example repo
- eval fixture 보강
- docs 보강

### 19.3 버전 전략

- `core` 와 `sdk` 는 호환성 관리가 중요하다.
- plugin API version 을 manifest 에 반드시 포함한다.
- breaking change 는 major version 으로 관리한다.

---

## 20. 향후 확장 방향

### 20.1 플러그인 세분화

MVP 이후에는 `Study Pack Plugin` 을 아래처럼 나눌 수 있다.

- Concept Plugin
- Exercise Plugin
- Evaluator Plugin

### 20.2 멀티 언어 지원

- TypeScript / React
- Python / Django
- Go
- Kafka ecosystem pack

### 20.3 UI 제공

향후 웹 UI 가 필요하다면 아래를 제공할 수 있다.

- concept graph 시각화
- session timeline
- progress dashboard
- exercise editor
- quiz screen

### 20.4 AI 보조 기능 강화

- 코드 근거 설명 품질 향상
- 사용자 오답 패턴 기반 리마인드
- 개념 복습 세션 자동 생성
- 학습자 수준에 따른 세션 난이도 조정

---

## 21. 핵심 결정 사항 요약

### 결정 1. 제품 철학

- 제품 비전은 범용이다.
- 하지만 초기 구현은 한 스택에 깊게 들어가는 학습팩으로 품질을 확보한다.

### 결정 2. 아키텍처

- 범용 코어 + 플러그인 구조
- 초기 플러그인 종류는 `Language Plugin`, `Study Pack Plugin` 두 가지

### 결정 3. MVP 범위

- Java + Spring Core 중심
- 로컬 repo 기반 CLI 중심
- 설명/실습/평가/진도 저장까지 포함

### 결정 4. 오픈소스 전략

- 코어와 SDK 를 공개
- 공식 학습팩 1개를 먼저 제공
- 이후 커뮤니티 플러그인 유도

---

## 22. Claude Code 에게 줄 개발 지시문 초안

아래는 Claude Code 에게 바로 전달할 수 있는 작업 지시의 초안이다.

```md
You are implementing the initial open-source architecture for Study Agent.

Goal:
Build a plugin-first CLI application that analyzes a local repository, selects a language plugin and a study-pack plugin, generates study sessions, scaffolds an exercise, evaluates a submission, and stores progress.

Constraints:
- Use TypeScript + Node.js + pnpm workspace.
- Keep the architecture plugin-first.
- Initial plugin kinds:
  1. Language Plugin
  2. Study Pack Plugin
- Initial official plugins:
  - plugin-java
  - pack-spring-core
- Do not build a web UI.
- Start with a clean, testable monorepo structure.

Required deliverables:
1. apps/cli
2. packages/core
3. packages/sdk
4. packages/shared
5. packages/plugin-java
6. packages/pack-spring-core
7. packages/progress-store
8. integration tests for analyze -> sessions -> start -> submit

Acceptance criteria:
- `study-agent analyze <repo>` works.
- `study-agent sessions <repo>` works.
- `study-agent start <repo> --session <id>` works.
- `study-agent submit <repo> --session <id> --path <submission>` works.
- progress is persisted locally.
- plugin manifest validation exists.
- integration tests pass.
```

---

## 23. 결론

`Study Agent` 의 핵심은 단순 코드 해설이 아니라, **코드베이스를 학습 가능한 구조로 변환하고, 사용자가 실제로 이해했는지 검증하는 것** 이다.

이를 위해 초기 구현은 다음 원칙을 따른다.

- 코어는 범용
- 학습 품질은 플러그인에서 담당
- 초기 플러그인 종류는 단순하게 유지
- MVP 는 Java + Spring Core 중심으로 깊게
- 설명, 실습, 평가, 진도 저장까지 end-to-end 로 연결

이 설계는 이후 JPA, Kafka, React, Django 등으로 확장 가능한 기반이 된다.
