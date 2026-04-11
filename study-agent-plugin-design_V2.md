# 스터디에이전트 Claude Code 네이티브 아키텍처 설계서

## 1. 문서 목적

이 문서는 **코드베이스를 학습 가능한 커리큘럼으로 변환하는 오픈소스 프로그램, `Study Agent`** 의 초기 설계를 정리한 문서다.

이 문서의 전제는 명확하다.

- `Study Agent` 는 **독립 LLM 애플리케이션** 이 아니다.
- `Study Agent` 의 **주 실행 환경은 Claude Code runtime** 이다.
- 사용자는 Claude Code 안에서 `/study-agent:run` 같은 **plugin skill** 로 에이전트를 실행한다.
- `Study Agent` 자체는 **Claude Code plugin + deterministic local engine** 으로 구성된다.

즉, 이 문서는 기존의 “독립 CLI 제품” 설계를 Claude Code 중심 구조로 재정의한다.

목표는 Claude Code가 이 문서를 바탕으로 바로 구현을 시작할 수 있도록, 다음 내용을 명확히 정의하는 것이다.

- 제품 목표와 범위
- Claude Code host-runtime 기준 시스템 구조
- Claude Code plugin 패키지 구조
- 내부 deterministic engine 구조
- Language Adapter / Study Pack 확장 구조
- 런타임 흐름
- MVP 범위
- 모노레포 구조
- 단계별 구현 계획

---

## 2. 아키텍처 방향 전환 요약

이 문서에서 가장 중요한 방향 전환은 아래와 같다.

### 이전 방향

- `Study Agent` 가 자체 CLI 앱처럼 동작
- 코어가 직접 LLM provider abstraction 을 가질 수 있음
- 플러그인 시스템이 최상위 실행 모델이었음

### 현재 방향

- `Study Agent` 는 **Claude Code plugin** 으로 배포됨
- Claude Code 가 모델 실행과 에이전트 오케스트레이션을 담당함
- `Study Agent` 는 **재현 가능한 학습 워크플로와 평가 로직** 을 담당함
- 내부 확장 구조는 계속 유지하되, Claude Code plugin 과 구분하기 위해 `Language Plugin` 대신 **Language Adapter**, `Study Pack Plugin` 대신 **Study Pack** 이라는 용어를 사용함

한 문장으로 정리하면 다음과 같다.

> Claude Code가 생각하고 대화하며, Study Agent는 로컬에서 재현 가능한 분석·실습·채점 엔진을 제공한다.

---

## 3. 제품 정의

### 3.1 한 줄 정의

`Study Agent` 는 사용자가 제공한 소스코드를 분석하여 핵심 개념을 추출하고, 이를 **step-by-step 학습 세션** 으로 변환한 뒤, 각 세션마다 **코드 근거 설명 → 미니 구현 실습 → 자동 평가 → 개념 퀴즈** 를 제공하는 Claude Code용 학습 에이전트다.

### 3.2 문제 정의

사용자는 오픈소스나 프레임워크 코드를 읽을 때 다음과 같은 문제를 겪는다.

- 어디부터 읽어야 할지 모른다.
- 파일은 읽었지만 설계 의도를 이해하지 못한다.
- 이해했다고 느껴도 직접 구현은 못 한다.
- 다음 날 다시 보면 처음부터 길을 잃는다.

`Study Agent` 는 이 문제를 해결하기 위해, 단순 코드 요약이 아니라 **이해를 증명하게 만드는 학습 루프** 를 제공해야 한다.

### 3.3 핵심 가치

- 큰 코드베이스를 **학습 경로** 로 압축한다.
- 설명을 항상 **실제 코드 근거** 와 연결한다.
- 사용자가 핵심 원리를 **직접 재구현** 해보게 만든다.
- hidden tests 와 퀴즈를 통해 **이해 완료 여부** 를 판정한다.
- Claude Code 안에서 자연스럽게 실행되는 **대화형 학습 경험** 을 제공한다.

---

## 4. 제품 목표와 비목표

### 4.1 목표

1. 사용자가 Claude Code 안에서 `/study-agent:run` 을 실행하면 repo 학습 경로가 생성된다.
2. 각 세션은 코드 근거 설명, 실습, 퀴즈를 포함한다.
3. 사용자는 Claude Code와 대화하면서 세션을 순차적으로 수행한다.
4. deterministic local engine 이 실습 scaffold 와 평가 결과를 재현 가능하게 생성한다.
5. 내부 확장 구조를 통해 언어/프레임워크별 학습팩을 추가할 수 있다.
6. 오픈소스 형태로 외부 기여가 가능한 구조를 갖춘다.

### 4.2 비목표

다음은 초기 MVP 범위에서 제외한다.

- 독립 실행형 GUI 제품
- 자체 LLM provider 라우팅 계층
- 모든 언어/프레임워크를 높은 품질로 지원
- 멀티유저 협업 학습
- 음성 튜터 기능
- 고급 시각화 대시보드
- 분산 시스템 전체를 실제 런타임 수준으로 시뮬레이션하는 기능
- Claude Code 없이 동일 UX를 제공하는 별도 상위 애플리케이션

---

## 5. 핵심 설계 원칙

### 5.1 Claude Code host-runtime native

`Study Agent` 는 Claude Code 위에서 동작하는 plugin 이다.

- 모델 추론
- 대화형 튜터링
- 계획 수립
- 코드 탐색
- 필요 시 subagent 활용

이런 역할은 Claude Code runtime 이 맡는다.

### 5.2 deterministic engine 우선

학습 구조와 평가의 source of truth 는 자유 생성 텍스트가 아니라 deterministic engine 이어야 한다.

반드시 고정되어야 하는 것:

- concept graph
- session 순서
- exercise blueprint
- starter files 구조
- hidden tests
- quiz answer key
- pass/fail 판정 기준

### 5.3 설명은 코드에 anchored 되어야 한다

모든 설명은 반드시 실제 코드 위치와 연결되어야 한다.

예시:

- 어떤 클래스가 어떤 역할을 하는지
- 어느 메서드가 흐름을 시작하는지
- 어떤 인터페이스/확장 포인트가 개입하는지

### 5.4 학습 단위는 파일이 아니라 메커니즘

학습 단위는 파일이 아니라 **개념/메커니즘** 이어야 한다.

예시:

- Spring: BeanDefinition, DI Resolution, Bean Lifecycle, Proxy/AOP
- Kafka: Partition, Consumer Group, Offset, Rebalance
- JPA: Persistence Context, Dirty Checking, Flush

### 5.5 Claude는 tutor, engine은 judge

Claude Code는 설명하고 안내하고 보충 질문을 만드는 역할을 맡는다.

deterministic engine 은 아래를 맡는다.

- 개념 구조 생성
- 실습 scaffold 생성
- hidden tests 실행
- 평가 점수 계산
- unlock 판단

즉,

- **Claude = 설명자 / 진행자 / 코치**
- **Engine = 판정자 / 기록자 / 재현성 보장자**

### 5.6 오픈소스 친화적 구조

외부 기여자는 아래 둘 중 하나를 기여할 수 있어야 한다.

- Claude Code plugin 레이어 자체 개선
- 내부 Language Adapter / Study Pack 추가

---

## 6. 2층 아키텍처 개요

이 프로젝트는 두 개의 명확한 층으로 나눈다.

### 6.1 Layer 1: Claude Code Plugin Layer

사용자가 직접 접하는 실행 계층이다.

구성 요소:

- `.claude-plugin/plugin.json`
- `skills/`
- `agents/` (선택)
- `hooks/` (선택)
- plugin 문서

역할:

- slash skill 진입점 제공
- Claude에게 Study Agent workflow 를 지시
- local engine 호출
- 결과를 사용자 친화적으로 설명
- 세션 진행을 대화형으로 안내

### 6.2 Layer 2: Deterministic Local Engine

로컬에서 재현 가능하게 돌아가는 실제 분석·평가 엔진이다.

구성 요소:

- engine core
- adapter registry
- study pack registry
- sandbox runner
- progress store
- engine CLI/API

역할:

- repo 분석
- language detection
- CodeModel 생성
- pack detection
- concept graph 생성
- session spec 생성
- exercise scaffold 생성
- quiz spec 생성
- hidden tests 기반 grading
- progress 저장

---

## 7. 전체 시스템 구조

```text
User in Claude Code
  -> Claude Code Plugin: /study-agent:run
      -> Claude reasoning + orchestration
      -> Study Agent local engine (CLI/API)
          -> Adapter Registry
              -> Language Adapter
              -> Study Pack
          -> Sandbox Runner
          -> Progress Store
      -> Claude explains results to user
```

핵심은 **Study Agent가 자체적으로 모델을 호출하지 않는다는 점** 이다.

Claude Code runtime 이 모델 실행을 맡고, Study Agent 는 Claude가 사용할 deterministic capability 를 제공한다.

---

## 8. Claude Code Plugin Layer 설계

## 8.1 패키징 단위

오픈소스로 배포되는 최상위 산출물은 **Claude Code plugin** 이다.

예시 plugin 이름:

- `study-agent`

사용자 진입 예시:

- `/study-agent:run`
- `/study-agent:next`
- `/study-agent:exercise`
- `/study-agent:quiz`
- `/study-agent:grade`
- `/study-agent:progress`

## 8.2 plugin 의 책임

plugin layer 의 책임은 아래와 같다.

1. 적절한 skill entrypoint 제공
2. Claude에게 현재 학습 단계에서 무엇을 해야 하는지 가이드
3. local engine 을 호출해 structured result 확보
4. structured result 를 바탕으로 사용자 친화적인 설명 생성
5. 세션 진행, 오답 피드백, 다음 행동 제안

## 8.3 plugin 이 하지 말아야 할 것

plugin layer 는 아래를 source of truth 로 소유하지 않는다.

- concept graph 최종 정의
- 채점 기준
- hidden tests
- unlock 판정

이것들은 모두 local engine 이 소유해야 한다.

## 8.4 MVP 에서 제공할 skill

### `/study-agent:run`

- 현재 repo 분석
- 적합한 pack 선택
- concept graph 와 session list 생성
- 첫 세션 시작 안내

### `/study-agent:next`

- 다음 unlock 가능한 세션 찾기
- 해당 세션 설명 시작

### `/study-agent:exercise`

- 현재 또는 지정된 세션의 실습 scaffold 생성
- 파일 위치와 요구사항 설명

### `/study-agent:quiz`

- 현재 또는 지정된 세션의 개념 퀴즈 진행
- 정답 입력 유도

### `/study-agent:grade`

- 제출 코드 grading 실행
- hidden tests 결과 + quiz 결과 반영
- 통과/실패 + 피드백 제공

### `/study-agent:progress`

- 전체 세션 상태 요약
- 다음 추천 세션 제안

## 8.5 optional agent / hook 방향

MVP 에서는 skill 중심으로 시작한다.

향후 추가 가능:

- `repo-explorer` subagent: 대형 repo 에서 evidence 후보 조사
- `misconception-reviewer` subagent: 오답 패턴 기반 약점 분석
- hook: `.study-agent/` 산출물 검증 또는 포맷 정리

단, grading 자체는 hook 에 숨기지 말고 명시적인 engine 호출로 유지한다.

---

## 9. Deterministic Local Engine 설계

## 9.1 엔진의 기본 철학

local engine 은 “설명문 생성기”가 아니라 **학습 구조와 평가 결과의 source of truth** 다.

엔진은 JSON/파일 기반 structured output 을 만든다.
Claude Code는 이를 읽어 자연어로 설명한다.

## 9.2 엔진의 핵심 책임

- repo scan
- language detect
- CodeModel build
- pack detect
- concept graph build
- session spec build
- exercise scaffold
- quiz spec build
- submission grade
- progress read/write

## 9.3 엔진 인터페이스 형태

MVP 에서는 엔진을 **로컬 CLI + 라이브러리** 두 형태로 제공하는 것이 좋다.

이유:

- Claude Code skill 이 Bash/tool 호출로 사용하기 쉽다.
- integration test 와 CI 가 쉽다.
- 나중에 Agent SDK 에서 직접 library import 하는 것도 가능하다.

예시 내부 명령:

```bash
study-agent-engine scan --repo . --json
study-agent-engine detect-pack --repo . --json
study-agent-engine build-sessions --repo . --json
study-agent-engine scaffold-exercise --repo . --session spring.di.01 --json
study-agent-engine grade --repo . --session spring.di.01 --submission ./solutions/session1 --json
study-agent-engine progress --repo . --json
```

---

## 10. 내부 확장 구조: Adapter / Pack

Claude Code plugin 과 내부 확장 구조를 혼동하지 않기 위해, 내부 개념은 `plugin` 대신 아래 용어를 사용한다.

### A. Language Adapter

역할:

- 언어/빌드 시스템 감지
- AST/심볼/참조 구조 생성
- import/call/dependency graph 생성
- 테스트 실행 방법 제공

예시:

- `adapter-java`
- `adapter-typescript`
- `adapter-python`

### B. Study Pack

역할:

- repo 에 어떤 개념을 가르칠지 결정
- concept graph 생성
- session spec 생성
- exercise spec 생성
- quiz spec 생성
- evaluation rule 정의

예시:

- `pack-spring-core`
- `pack-jpa-hibernate`
- `pack-kafka-core`
- `pack-react-fundamentals`

### 왜 Adapter / Pack 으로 부르나

최상위 배포 단위가 Claude Code plugin 이기 때문에, 내부 확장 구조까지 plugin 이라고 부르면 설계와 구현이 혼동된다.

따라서:

- **Claude Code Plugin** = 사용자에게 설치되는 호스트 확장
- **Language Adapter / Study Pack** = Study Agent 엔진 내부 확장 단위

---

## 11. 계약(Contract) 설계

아래 인터페이스는 TypeScript 기준의 초안이다.

### 11.1 공통 타입

```ts
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  kind: "language-adapter" | "study-pack";
  supports?: string[];
}
```

### 11.2 Language Adapter 인터페이스

```ts
export interface LanguageAdapter {
  manifest: ExtensionManifest;

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

### 11.3 Study Pack 인터페이스

```ts
export interface StudyPack {
  manifest: ExtensionManifest;

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
  }): Promise<StudySessionSpec[]>;

  buildExerciseSpec(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySessionSpec;
    workspace: WorkspaceContext;
  }): Promise<ExerciseSpec | null>;

  buildQuizSpec(input: {
    session: StudySessionSpec;
    exercise?: ExerciseSpec | null;
  }): Promise<QuizSpec | null>;

  evaluateSubmission(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySessionSpec;
    workspace: WorkspaceContext;
    submissionPath: string;
  }): Promise<EvaluationResult>;
}
```

### 11.4 왜 `generate*` 대신 `build*Spec` 인가

기존 설계의 `generateExercise()`, `generateQuiz()` 는 자유 생성처럼 보일 수 있다.
하지만 Claude Code native 구조에서는 source of truth 가 deterministic engine 이어야 한다.

따라서 Study Pack 은 자유 텍스트를 생성하는 대신 아래를 만든다.

- `ExerciseSpec`
- `QuizSpec`
- `StudySessionSpec`

Claude Code plugin layer 는 이 structured spec 을 바탕으로 설명을 자연스럽게 풀어준다.

---

## 12. 핵심 도메인 모델

### 12.1 RepoContext

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

### 12.2 CodeModel

`Language Adapter` 가 생성하는 언어 중립적인 분석 결과다.

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

### 12.3 ConceptGraph

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

### 12.4 StudySessionSpec

실제 사용자에게 보여줄 학습 세션의 구조적 정의다.

```ts
export interface StudySessionSpec {
  id: string;
  conceptId: string;
  title: string;
  learningGoals: string[];
  explanationOutline: ExplanationOutlineItem[];
  evidence: CodeEvidence[];
  misconceptions?: string[];
  prerequisites?: string[];
  unlockRule?: UnlockRule;
}
```

### 12.5 ExerciseSpec

```ts
export interface ExerciseSpec {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  starterFiles: StarterFile[];
  expectedArtifacts: string[];
  hiddenTestPlan?: HiddenTestPlan;
  hints?: string[];
}
```

### 12.6 QuizSpec

```ts
export interface QuizSpec {
  id: string;
  sessionId: string;
  questions: QuizQuestion[];
  answerKey: QuizAnswerKey;
  passingScore: number;
}
```

### 12.7 EvaluationResult

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

## 13. 설명/실습/퀴즈 생성 정책

## 13.1 원칙

MVP 는 **결정론 우선 하이브리드** 로 설계한다.

### 정적으로 정의하는 것

- concept graph
- session 순서
- exercise blueprint
- starter files 구조
- hidden tests
- quiz answer key
- evaluation rule

### Claude Code가 서술하는 것

- 세션 설명 문장
- 현재 repo 에 맞춘 코드 맥락 요약
- 힌트 문구
- 오답 피드백의 표현
- 추가 보충 설명

## 13.2 책임 분리

Study Pack 은 “무엇을 가르치고 무엇을 검사할지”를 결정한다.
Claude 는 “그것을 사용자에게 어떻게 이해하기 쉽게 말할지”를 맡는다.

즉,

- `buildSessions()` 는 학습 설계
- `/study-agent:run` skill 은 학습 진행

## 13.3 evaluateSubmission 정책

`evaluateSubmission()` 의 판정은 LLM 기반이 아니어야 한다.

우선순위:

1. hidden tests
2. public tests
3. rule-based checks
4. 최종 pass/fail 및 score 계산

Claude 는 이 결과를 바탕으로 설명형 피드백을 정리할 수는 있지만, 판정 자체를 뒤집을 수는 없다.

---

## 14. 엔진 산출물(workspace) 설계

학습 상태와 중간 산출물은 repo 내부의 `.study-agent/` 아래에 저장한다.

예시:

```text
.study-agent/
  analysis.json
  concept-graph.json
  sessions.json
  progress.json
  exercises/
    spring.di.01/
      README.md
      starter/
      tests/
  reports/
    spring.di.01-grade.json
```

### 산출물 정책

- 엔진이 생성한 JSON 이 canonical source 이다.
- Claude 는 이 파일들을 읽어 사용자에게 설명한다.
- 세션 중단 후 재개가 가능해야 한다.
- headless automation 도 같은 산출물을 사용해야 한다.

---

## 15. 런타임 흐름

## 15.1 대화형 실행 흐름

1. 사용자가 repo 루트에서 Claude Code 를 연다.
2. `study-agent` plugin 이 설치되어 있다.
3. 사용자가 `/study-agent:run` 을 실행한다.
4. Claude 가 현재 repo 를 파악하고, local engine 을 호출한다.
5. engine 이 language detect, CodeModel build, pack detect, sessions build 를 수행한다.
6. engine 이 `.study-agent/` 산출물을 생성한다.
7. Claude 가 첫 세션을 사용자에게 설명한다.
8. 사용자가 실습을 진행한다.
9. `/study-agent:grade` 또는 `/study-agent:quiz` 로 평가를 수행한다.
10. 통과하면 다음 세션 unlock.

## 15.2 headless 실행 흐름

headless automation 은 2차 목표다.

실행 원칙:

- Claude Code runtime 을 그대로 사용한다.
- plugin 이 로드된 상태로 non-interactive 실행한다.
- engine 산출물은 interactive mode 와 동일하다.

대표 사용 사례:

- repo onboarding report 생성
- 세션 초안 precompute
- CI 에서 grading 회귀 검증
- 커뮤니티 example repo baseline 생성

---

## 16. 권장 Claude Code UX

### 16.1 사용자 진입

```text
/study-agent:run
```

기대 동작:

- repo 분석
- 선택된 pack 안내
- 세션 목록 요약
- 첫 세션 시작

### 16.2 다음 세션 진행

```text
/study-agent:next
```

기대 동작:

- 현재 progress 기준 다음 세션 선택
- prerequisite 체크
- 세션 설명 시작

### 16.3 실습 scaffold 생성

```text
/study-agent:exercise spring.di.01
```

기대 동작:

- exercise scaffold 생성
- starter file 위치 안내
- 구현 목표 설명

### 16.4 채점

```text
/study-agent:grade spring.di.01 ./solutions/session1
```

기대 동작:

- hidden tests 실행
- score 계산
- 통과/실패 피드백

### 16.5 퀴즈

```text
/study-agent:quiz spring.di.01
```

기대 동작:

- quiz 진행
- score 계산
- 약한 개념 표시

### 16.6 진도 확인

```text
/study-agent:progress
```

기대 동작:

- passed / failed / available / locked 세션 요약
- 다음 추천 세션 출력

---

## 17. 추천 모노레포 구조

초기 오픈소스 구조는 `pnpm workspace + TypeScript` 를 권장한다.

```text
study-agent/
  plugins/
    study-agent/
      .claude-plugin/
        plugin.json
      skills/
        run/
          SKILL.md
        next/
          SKILL.md
        exercise/
          SKILL.md
        quiz/
          SKILL.md
        grade/
          SKILL.md
        progress/
          SKILL.md
      agents/
        repo-explorer.md          # optional, phase 2+
      hooks/
        hooks.json                # optional, phase 2+
      README.md
  apps/
    engine-cli/
  packages/
    engine-core/
    engine-sdk/
    shared/
    adapter-java/
    pack-spring-core/
    sandbox-runner/
    progress-store/
  examples/
    sample-spring-project/
  docs/
    architecture/
    packs/
    plugin/
  tests/
    integration/
    fixtures/
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
```

### 17.1 각 패키지 역할

#### `plugins/study-agent`

- Claude Code plugin 패키지
- skill entrypoint 정의
- Claude에게 workflow 지침 제공
- local engine 호출 규약 정의

#### `apps/engine-cli`

- deterministic local engine CLI 엔트리포인트
- JSON 출력
- integration 및 headless automation 친화적 구조

#### `packages/engine-core`

- adapter registry
- pack registry
- orchestrator
- session builder
- grading pipeline

#### `packages/engine-sdk`

- engine public types
- extension contracts
- helper util

#### `packages/shared`

- 공통 타입
- logger
- config loader
- error model

#### `packages/adapter-java`

- Java repo detect
- CodeModel 생성
- gradle/maven 테스트 실행 연동

#### `packages/pack-spring-core`

- Spring detect
- ConceptGraph 생성
- SessionSpec 생성
- ExerciseSpec / QuizSpec / EvaluationRule 정의

#### `packages/sandbox-runner`

- 실습 파일 생성
- 임시 workspace 구성
- 테스트/컴파일 실행

#### `packages/progress-store`

- 사용자 진도 저장
- 세션 상태 관리
- unlock 판단용 저장소

---

## 18. MVP 범위

## 18.1 기술 선택

- Host Runtime: Claude Code plugin system
- Engine Language: TypeScript
- Runtime: Node.js
- Package Manager: pnpm
- Test Runner: Vitest 또는 Jest
- Parsing:
  - Java: Tree-sitter 또는 Java parser 연동 후보
  - 초기엔 최소 기능부터 시작 가능

## 18.2 포함

- Claude Code plugin package
- `/study-agent:run`, `/study-agent:next`, `/study-agent:exercise`, `/study-agent:quiz`, `/study-agent:grade`, `/study-agent:progress`
- local repo 입력
- Java adapter
- Spring Core pack
- concept graph 생성
- 5~8개 세션 생성
- exercise scaffold 생성
- hidden test 기반 grading
- quiz 기반 개념 검증
- progress 저장
- `.study-agent/` 산출물 저장

## 18.3 제외

- 웹 UI
- 별도 독립 최상위 CLI UX
- 다중 언어 동시 품질 보장
- 고급 그래프 시각화
- 협업 기능
- 원격 실행 인프라
- 자체 provider abstraction

## 18.4 Spring Core 예시 세션

1. IoC 와 Bean Metadata
2. Bean 등록과 BeanDefinition
3. Bean 생성과 Singleton Registry
4. 생성자 기반 DI Resolution
5. Lifecycle Hook 과 Post Processor
6. Proxy / AOP 의 필요성

---

## 19. Study Pack 설계 가이드

`Study Pack` 은 단순 요약기가 아니라, deterministic 한 학습 구조 설계자여야 한다.

### 19.1 detect 규칙

예: Spring Core pack

- `@Component`, `@Bean`, `ApplicationContext`, `BeanFactory` 존재 여부
- `spring-context`, `spring-beans` 의존성 유무
- 특정 패키지명/클래스명 시그널

### 19.2 concept graph 규칙

개념을 다음 기준으로 나눈다.

- 메커니즘 중심인지
- 선행 개념이 있는지
- 실습으로 축소 가능한지
- 오개념이 자주 발생하는지

### 19.3 session 생성 규칙

각 세션은 아래를 포함해야 한다.

- 제목
- 학습 목표
- explanation outline
- 코드 근거 목록
- misconceptions
- 실습 여부
- 퀴즈 여부
- 통과 기준

### 19.4 exercise 생성 규칙

실습은 원본 코드를 그대로 따라치게 하면 안 된다.
반드시 핵심 원리만 남긴 축소판 재구현이어야 한다.

예:

- mini DI container
- simple bean registry
- toy post processor hook

### 19.5 quiz 생성 규칙

MVP 에서는 문제 bank 와 템플릿 중심으로 구성한다.

반드시 포함:

- 개념 차이 설명 문제
- 설계 이유 질문
- 오개념 확인 질문

### 19.6 evaluation 규칙

평가 기준은 최소 다음 3개 축을 갖는다.

- 실행 성공 여부
- hidden test 통과 여부
- 개념 퀴즈 통과 여부

---

## 20. 내부 품질 검증용 Eval Harness

오픈소스라고 해도, `Study Agent` 자체의 품질을 검증하는 내부 eval harness 가 필요하다.

### 20.1 목적

- adapter / pack 변경 시 회귀 검증
- session 생성 오류 감지
- exercise 난이도 붕괴 감지
- grading 로직 붕괴 감지

### 20.2 최소 구성

- golden repo fixture
- expected concept graph snapshot
- expected session count
- exercise spec snapshot
- hidden test pass/fail fixture
- sample quiz answers
- `.study-agent/` output snapshot

### 20.3 권장 테스트 종류

- unit test: registry, loader, config
- integration test: run -> exercise -> grade -> progress 전체 흐름
- snapshot test: concept graph/session spec output
- regression test: pack 변경 전후 결과 비교

---

## 21. 진도 및 잠금 해제 규칙

초기엔 아주 단순한 mastery model 로 시작한다.

### 21.1 세션 상태

- `locked`
- `available`
- `in_progress`
- `passed`
- `failed`

### 21.2 통과 규칙 예시

- exercise required 인 경우: hidden test 통과
- quiz required 인 경우: passing score 이상
- 둘 다 required 인 경우: 둘 다 만족해야 `passed`

### 21.3 저장 예시

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

## 22. 구현 순서 제안

Claude Code 에게 한 번에 모든 기능을 시키기보다, 아래 단계로 나눠서 개발하는 것이 좋다.

### Phase 1. Claude Code plugin skeleton

목표:

- `.claude-plugin/plugin.json`
- 최소 1개 skill (`/study-agent:run`)
- local testing 가능
- plugin 문서화

완료 조건:

- `claude --plugin-dir ./plugins/study-agent` 로 plugin 을 로드하고 `/study-agent:run` 이 인식된다.

### Phase 2. Engine skeleton

목표:

- engine CLI 실행 가능
- config 로더
- registry
- 기본 로깅
- JSON 출력 기반 command shape 확정

완료 조건:

- `study-agent-engine scan --repo . --json` 이 동작한다.

### Phase 3. Java adapter

목표:

- `LanguageAdapter` 인터페이스 확정
- `adapter-java` detect 구현
- 매우 단순한 CodeModel 생성

완료 조건:

- Java repo 분석 시 Java adapter 가 선택된다.

### Phase 4. Spring pack

목표:

- `StudyPack` 인터페이스 확정
- `pack-spring-core` detect 구현
- 하드코딩 기반 concept/session spec 생성부터 시작

완료 조건:

- Spring repo 에서 기본 세션 목록이 생성된다.

### Phase 5. Exercise / Quiz / Grade flow

목표:

- exercise scaffold 생성
- hidden test 실행
- quiz spec 생성
- pass/fail 저장

완료 조건:

- `/study-agent:exercise` 와 `/study-agent:grade` 가 end-to-end 로 동작한다.

### Phase 6. Tutor UX refinement

목표:

- Claude skill 지침 개선
- 세션 설명 품질 개선
- 오답 피드백 가독성 향상

완료 조건:

- 사용자 입장에서 실질적인 학습 세션 경험이 가능하다.

### Phase 7. Internal eval harness

목표:

- integration fixture 추가
- snapshot baseline 추가
- 회귀 테스트 자동화

완료 조건:

- 주요 흐름 변경 시 테스트로 품질 저하를 감지할 수 있다.

---

## 23. 오픈소스 운영 전략

### 23.1 초기 메시지

프로젝트의 메시지는 다음이 적절하다.

> Study Agent is an open-source Claude Code learning plugin that turns a codebase into a structured study program with explanation, practice, and mastery checks.

### 23.2 기여 방향

초기에는 다음 형태의 기여를 유도한다.

- 새로운 Language Adapter
- 새로운 Study Pack
- plugin skill 개선
- example repo 보강
- eval fixture 보강
- docs 보강

### 23.3 버전 전략

- `engine-core` 와 `engine-sdk` 는 호환성 관리가 중요하다.
- adapter / pack API version 을 manifest 에 포함한다.
- Claude Code plugin 패키지 버전과 engine 패키지 버전을 분리 관리할 수 있어야 한다.

---

## 24. 핵심 결정 사항 요약

### 결정 1. 실행 환경

- primary runtime 은 Claude Code 다.
- 사용자는 `/study-agent:*` skill 형태로 에이전트를 사용한다.

### 결정 2. LLM 소유권

- `Study Agent` 는 자체 provider abstraction 을 만들지 않는다.
- 모델 실행과 오케스트레이션은 Claude Code host runtime 이 맡는다.

### 결정 3. source of truth

- concept graph
- exercise spec
- quiz spec
- evaluation result

위 항목은 deterministic local engine 이 소유한다.

### 결정 4. 내부 확장 구조

- 내부 확장 단위는 `Language Adapter`, `Study Pack`
- Claude Code plugin 과 개념적으로 분리한다.

### 결정 5. MVP 범위

- Java + Spring Core 중심
- Claude Code plugin + local engine 조합
- 설명/실습/평가/진도 저장까지 end-to-end 로 연결

---

## 25. Claude Code 에게 줄 개발 지시문 초안

아래는 Claude Code 에게 바로 전달할 수 있는 작업 지시의 초안이다.

```md
You are implementing the initial open-source architecture for Study Agent.

Primary constraint:
Study Agent is not a standalone LLM app. It runs natively on top of Claude Code as a plugin with namespaced skills such as `/study-agent:run`.

Architecture:
- Host layer: Claude Code plugin
- Deterministic layer: local engine CLI/library
- Internal extension model:
  1. Language Adapter
  2. Study Pack

Rules:
- Do not build a separate provider abstraction layer.
- Do not make grading depend on free-form LLM judgment.
- Keep concept graph, exercise specs, quiz answer keys, and grading rules deterministic.
- Claude is responsible for tutoring and user-facing explanations.
- The engine is responsible for analysis, scaffolding, grading, and progress persistence.

Required deliverables:
1. plugins/study-agent/.claude-plugin/plugin.json
2. plugins/study-agent/skills/run/SKILL.md
3. plugins/study-agent/skills/next/SKILL.md
4. plugins/study-agent/skills/exercise/SKILL.md
5. plugins/study-agent/skills/quiz/SKILL.md
6. plugins/study-agent/skills/grade/SKILL.md
7. plugins/study-agent/skills/progress/SKILL.md
8. apps/engine-cli
9. packages/engine-core
10. packages/engine-sdk
11. packages/adapter-java
12. packages/pack-spring-core
13. packages/progress-store
14. integration tests for run -> exercise -> grade -> progress

Acceptance criteria:
- Claude Code can load the plugin locally.
- `/study-agent:run` works in a sample Spring repo.
- The engine can generate `.study-agent/analysis.json`, `sessions.json`, and `progress.json`.
- `/study-agent:exercise` scaffolds a deterministic exercise.
- `/study-agent:grade` runs hidden tests and returns pass/fail.
- Progress is persisted locally.
- Integration tests pass.
```

---

## 26. 결론

`Study Agent` 의 핵심은 단순 코드 해설이 아니라, **코드베이스를 학습 가능한 구조로 변환하고, 사용자가 실제로 이해했는지 검증하는 것** 이다.

Claude Code native 방향으로 재정의한 결과, 이 프로젝트는 다음과 같이 정리된다.

- Claude Code 는 생각하고 대화하며 튜터링한다.
- Study Agent local engine 은 구조를 만들고 실습을 채점한다.
- 최상위 배포 단위는 Claude Code plugin 이다.
- 내부 확장 단위는 Language Adapter 와 Study Pack 이다.
- MVP 는 Java + Spring Core 중심으로 end-to-end 품질을 확보한다.

이 구조는 이후 JPA, Kafka, React, Django 등으로 확장 가능한 기반이 된다.
