# Study Agent

> Turn any codebase into a structured study program — explanation grounded in real code, hands-on mini-implementation, and deterministic mastery checks. Runs inside Claude Code.

**Status:** Pre-release (MVP 1.0). Java + Spring Core only.

[Report Bug / Request Feature](https://github.com/ksh9891/study-agent/issues) · [Agent onboarding (CLAUDE.md)](./CLAUDE.md)

---

## About

큰 코드베이스를 처음부터 읽는 건 길을 잃기 쉽습니다. Study Agent는 repo를 분석해 핵심 개념을 추출하고, 그걸 **step-by-step 학습 세션**으로 바꿔줍니다. 각 세션은 다음 루프를 따릅니다:

1. 실제 repo 코드 근거로 개념을 설명 (Claude가 튜터 역할)
2. 미니 구현 과제를 던지고 starter 파일을 제공
3. 숨겨진 테스트로 제출물을 채점 (deterministic)
4. 개념 퀴즈로 이해도 확인
5. exercise + quiz 모두 통과하면 다음 세션을 unlock

대상: Claude Code를 쓰면서 특정 오픈소스(예: Spring) 내부 동작을 스스로 재구현하며 배우고 싶은 개발자.

## How it works

2층 구조입니다. Claude는 **튜터**(설명·코칭), 엔진은 **판정자**(결정적 채점·진도 기록) 역할만 맡아 경계가 섞이지 않도록 분리돼 있습니다.

```
Claude Code
  ├─ Plugin skill이 지침을 Claude에 주입
  └─ Claude가 study-agent-engine CLI를 Bash로 호출
       ├─ adapter-java: 언어 감지 + lightweight CodeModel
       ├─ pack-spring-core: canonical concept DAG + exercise/quiz 번들
       └─ engine-core: planning, grading, progress, sandbox
```

같은 repo에 같은 pack·설정이면 항상 같은 학습 계획이 생성됩니다 (deterministic). 구조 상세는 [agent_docs/architecture.md](./agent_docs/architecture.md).

## Features

- **Codebase-driven sessions** — 실제 repo의 annotation/dependency/구조를 evidence로 모아 concept DAG의 repo-specific 부분집합을 생성
- **Pack-authored content** — exercise 번들과 quiz 스펙을 pack maintainer가 정적으로 author. 엔진은 templating + grading만 담당
- **Deterministic grading** — hidden test 실행 기반 exercise 채점 + 정답 키 기반 퀴즈 채점. Claude가 판정을 뒤집을 수 없음
- **Unlock transition** — exercise + quiz 모두 통과 시 후속 세션을 자동 `locked → available`로 전환
- **Progress persistence** — `.study-agent/progress.json`에 로컬 저장, 세션 재개 가능

## Requirements

- Node.js ≥ 20
- pnpm
- Claude Code
- (대상 repo용) Java 17+ / Maven 또는 Gradle

## Quick Start

현재 마켓플레이스 미배포. 로컬에서 plugin으로 로드합니다.

```bash
# 1. clone + build
git clone https://github.com/ksh9891/study-agent.git
cd study-agent
pnpm install
pnpm build

# 2. sample Spring 프로젝트에 대해 Claude Code 실행
cd examples/sample-spring-project
claude --plugin-dir ../../plugins/study-agent

# 3. Claude 세션 안에서
/study-agent:run
```

본인 repo에 쓰려면 `examples/sample-spring-project` 대신 해당 디렉토리에서 Claude를 실행하세요. 단, MVP는 Spring Core 기반 Java 프로젝트만 감지합니다 (아래 Project Status 참고).

## Usage

Claude Code 안에서 사용할 수 있는 slash command:

| Command | 하는 일 |
|---|---|
| `/study-agent:run` | repo 분석, 세션 목록 생성, 첫 세션 소개 |
| `/study-agent:next` | 다음으로 공부할 세션 추천 |
| `/study-agent:exercise` | 현재 세션의 실습 starter 파일 생성 + 코칭 |
| `/study-agent:grade` | 제출물을 hidden test로 채점 |
| `/study-agent:quiz` | 개념 퀴즈 출제·채점 |
| `/study-agent:progress` | 세션별 진행 상태 요약 |

세션 산출물은 repo 내 `.study-agent/`에 기록됩니다.

## Project Status

**MVP 1.0 완료 — pre-release.** 공개적으로 사용 권장하는 단계는 아닙니다.

- ✅ Two-session unlock slice 동작 (세션 1 passed → 세션 2 unlock)
- ✅ Eval harness로 pack/engine 회귀 감지 (`pnpm test:eval`)
- ✅ Java adapter + Spring Core pack (세션 1~2 완전 authored)
- ⏳ 세션 3~6: 구조만 존재, 콘텐츠 authoring 진행 예정 (Slice 3b)
- ❌ Java/Spring 외 언어·프레임워크 미지원
- ❌ 마켓플레이스 배포 미정

## Roadmap

- **Slice 3b** — 세션 3~6 exercise/quiz authoring
- MCP server mode (long-running daemon 대안)
- 추가 pack (JPA/Hibernate, Kafka 등) 및 추가 adapter (TypeScript, Python)
- CodeModel 고급 기능 (references, call graph)

상세: [agent_docs/mvp-roadmap.md](./agent_docs/mvp-roadmap.md)

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Claude Code 에이전트용 온보딩 (사람도 읽을 만함)
- [agent_docs/architecture.md](./agent_docs/architecture.md) — 2층 구조, 책임 분리, 핵심 설계 결정
- [agent_docs/workflows.md](./agent_docs/workflows.md) — 테스트 계층, golden 갱신, slice 흐름
- [agent_docs/mvp-roadmap.md](./agent_docs/mvp-roadmap.md) — 제품 정의, slice 현황
- [docs/superpowers/specs/](./docs/superpowers/specs/) — date-stamped 설계 스펙 (single source of truth)
- [docs/superpowers/plans/](./docs/superpowers/plans/) — slice별 구현 계획

## Testing

```bash
pnpm test        # unit + integration
pnpm test:eval   # golden-file regression harness
pnpm test:all    # 둘 다
```

Golden 갱신은 `UPDATE_GOLDEN=1 pnpm test:eval` 후 반드시 diff 리뷰.

## Contributing

Pre-release 단계라 적극적 기여 모집은 아직 열어두지 않습니다. 버그·아이디어 제보는 [GitHub Issues](https://github.com/ksh9891/study-agent/issues)로 환영합니다. PR은 먼저 issue를 통해 방향을 맞춘 뒤 올려 주세요.

개발 흐름은 slice 기반입니다: spec (`docs/superpowers/specs/`) → plan (`docs/superpowers/plans/`) → implement. 자세한 커밋/PR 규약은 [agent_docs/workflows.md](./agent_docs/workflows.md).

## License

현재 별도 LICENSE 파일이 없으며 `package.json`은 `private`로 표시돼 있습니다. 공개 배포 전에 라이선스가 확정됩니다. 이 저장소의 코드 사용을 고려 중이라면 먼저 issue로 문의해 주세요.
