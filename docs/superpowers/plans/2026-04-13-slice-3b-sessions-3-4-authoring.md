# Slice 3b — Sessions 3 & 4 Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author `spring.di.03` (SingletonBeanRegistry) and `spring.di.04` (ConstructorResolver) sessions — exercise bundles, hidden tests, quiz specs, registry wiring — so learners can progress through all four core sessions end-to-end.

**Architecture:** Pack-authored static bundles under `packages/pack-spring-core/exercises/<session>/` and `quiz/<session>.yaml`, registered in `exercise-builder.ts` + `quiz-builder.ts` inline maps. Engine core is unchanged. Eval regression via existing golden harness (`tests/eval/`) with `UPDATE_GOLDEN=1` snapshots.

**Tech Stack:** TypeScript (Node ≥20, pnpm workspace), Vitest, Java 17+ (hidden-test source, not compiled in grading), JUnit 5 (test source).

**Spec:** `docs/superpowers/specs/2026-04-13-slice-3b-sessions-3-4-authoring-design.md`

**Key observation (MVP grading):** `gradeCommand` checks **file presence only** (`apps/engine-cli/src/commands/grade.ts:14-18`). Hidden tests are copied as artifacts to `.study-agent-internal/` but not actually compiled/run. We still write realistic JUnit tests because they are the learner-facing source of truth for "did I implement correctly" and will become runnable in a later slice.

---

## File Structure

**New files (packages/pack-spring-core/):**

```
exercises/di-03-singleton-registry/
  exercise.yaml
  starter/
    BeanDefinition.java.tmpl
    SingletonBeanRegistry.java.tmpl
    BeanFactory.java.tmpl
    README.md
  hidden-tests/
    SingletonRegistryTest.java

exercises/di-04-constructor-di/
  exercise.yaml
  starter/
    BeanDefinition.java.tmpl
    BeanFactory.java.tmpl
    ConstructorResolver.java.tmpl
    README.md
  hidden-tests/
    ConstructorResolverTest.java

quiz/di-03-singleton-registry.yaml
quiz/di-04-constructor-di.yaml
```

**Modified files:**

- `packages/pack-spring-core/src/exercise-builder.ts` — add 2 entries to `SESSION_TO_EXERCISE` and `hiddenTestFiles`
- `packages/pack-spring-core/src/quiz-builder.ts` — add 2 entries to `QUIZ_SPECS`
- `tests/eval/helpers/fixtures-list.ts` — extend `AUTHORED_SESSIONS`
- `agent_docs/mvp-roadmap.md` — mark Slice 3b as merged
- `CLAUDE.md` — update "지금 어디쯤인가" line

**Golden artifacts (generated via `UPDATE_GOLDEN=1`, not written by hand):**

For each fixture `sample-spring-core` and `sample-spring-with-lifecycle`:
```
tests/eval/fixtures/<fixture>/expected/exercises/spring.di.03/exercise-spec.json
tests/eval/fixtures/<fixture>/expected/exercises/spring.di.03/starter/*.java
tests/eval/fixtures/<fixture>/expected/exercises/spring.di.04/exercise-spec.json
tests/eval/fixtures/<fixture>/expected/exercises/spring.di.04/starter/*.java
tests/eval/fixtures/<fixture>/expected/quiz/spring.di.03/quiz.json
tests/eval/fixtures/<fixture>/expected/quiz/spring.di.04/quiz.json
tests/eval/fixtures/<fixture>/expected/grade/spring.di.03.passed.json
tests/eval/fixtures/<fixture>/expected/grade/spring.di.03.failing.json
tests/eval/fixtures/<fixture>/expected/grade/spring.di.04.passed.json
tests/eval/fixtures/<fixture>/expected/grade/spring.di.04.failing.json
```

**Hand-authored golden-submissions** (grade pass case input — copies of rendered starter with `{{packageName}}` substituted):
```
tests/eval/fixtures/<fixture>/golden-submissions/spring.di.03/*.java + README.md
tests/eval/fixtures/<fixture>/golden-submissions/spring.di.04/*.java + README.md
```

These are hand-authored because `grade.test.ts` uses them as submission inputs (see `tests/eval/grade.test.ts:21-23`).

---

## Task 1: Author di-03 exercise bundle (yaml + starter + README)

**Files:**
- Create: `packages/pack-spring-core/exercises/di-03-singleton-registry/exercise.yaml`
- Create: `packages/pack-spring-core/exercises/di-03-singleton-registry/starter/BeanDefinition.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-03-singleton-registry/starter/SingletonBeanRegistry.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-03-singleton-registry/starter/BeanFactory.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-03-singleton-registry/starter/README.md`

- [ ] **Step 1: Create `exercise.yaml`**

```yaml
id: ex-di-03
sessionId: spring.di.03
title: "Singleton Bean Registry"
prompt: "Implement a SingletonBeanRegistry and a BeanFactory that lazily instantiates beans and caches them as singletons"
templateVariables:
  packageName: "com.studyagent.exercise"
starterFiles:
  - path: "BeanDefinition.java"
    description: "Bean metadata (name + class)"
  - path: "SingletonBeanRegistry.java"
    description: "In-memory map of singleton instances"
  - path: "BeanFactory.java"
    description: "Registers definitions and returns lazily-created singletons"
expectedArtifacts:
  - "BeanDefinition.java"
  - "SingletonBeanRegistry.java"
  - "BeanFactory.java"
hints:
  - "SingletonBeanRegistry is just a Map<String, Object> wrapper with register/get/contains"
  - "BeanFactory.getBean(name) checks the singleton registry first; only instantiates on cache miss"
  - "Use Class.getDeclaredConstructor().newInstance() for zero-arg instantiation"
```

- [ ] **Step 2: Create `starter/BeanDefinition.java.tmpl`**

```java
package {{packageName}};

/**
 * Represents metadata about a bean before it is instantiated.
 * TODO: Add fields for bean name and bean class.
 * TODO: Add constructor and getters.
 */
public class BeanDefinition {
    // TODO: Implement bean metadata storage
}
```

- [ ] **Step 3: Create `starter/SingletonBeanRegistry.java.tmpl`**

```java
package {{packageName}};

import java.util.Map;
import java.util.HashMap;

/**
 * Stores already-created singleton bean instances keyed by name.
 * TODO: Implement getSingleton(name), registerSingleton(name, obj), containsSingleton(name)
 *       using a HashMap<String, Object>.
 */
public class SingletonBeanRegistry {
    // TODO: Implement singleton cache
}
```

- [ ] **Step 4: Create `starter/BeanFactory.java.tmpl`**

```java
package {{packageName}};

import java.util.Map;
import java.util.HashMap;

/**
 * Minimal BeanFactory:
 *  - registerBeanDefinition(BeanDefinition) stores metadata
 *  - getBean(name) returns cached singleton; on cache miss, instantiates via reflection
 *    (Class.getDeclaredConstructor().newInstance()) then caches
 *  - throws RuntimeException (or IllegalStateException) when no BeanDefinition is registered for name
 */
public class BeanFactory {
    // TODO: Implement registerBeanDefinition + getBean with lazy instantiation + singleton caching
}
```

- [ ] **Step 5: Create `starter/README.md`**

```markdown
# Singleton Bean Registry Exercise

Implement a minimal BeanFactory that lazily creates beans and caches them as singletons.

## Requirements
1. `BeanDefinition` stores bean metadata (name, beanClass)
2. `SingletonBeanRegistry` holds a Map<String, Object> of already-instantiated beans with `getSingleton`, `registerSingleton`, `containsSingleton`
3. `BeanFactory.registerBeanDefinition(BeanDefinition)` stores the definition
4. `BeanFactory.getBean(String name)`:
   - Returns the cached singleton if one exists for `name`
   - Otherwise: looks up the BeanDefinition, instantiates the bean class via reflection (`getDeclaredConstructor().newInstance()`), caches it in the registry, and returns it
5. `BeanFactory.getBean` throws `RuntimeException` (or a subclass) when no definition is registered for the given name
6. Use only public zero-arg constructors (no setAccessible needed for this exercise)
```

- [ ] **Step 6: Commit**

```bash
git add packages/pack-spring-core/exercises/di-03-singleton-registry
git commit -m "feat(pack): add di-03 singleton-registry exercise bundle"
```

---

## Task 2: Author di-03 hidden test

**Files:**
- Create: `packages/pack-spring-core/exercises/di-03-singleton-registry/hidden-tests/SingletonRegistryTest.java`

- [ ] **Step 1: Create `hidden-tests/SingletonRegistryTest.java`**

```java
package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class Greeting {}

class SingletonRegistryTest {
    @Test
    void testFirstGetBeanCreatesInstance() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("greeting", Greeting.class));
        Object bean = factory.getBean("greeting");
        assertNotNull(bean);
        assertTrue(bean instanceof Greeting);
    }

    @Test
    void testSubsequentGetBeanReturnsSameInstance() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("greeting", Greeting.class));
        Object first = factory.getBean("greeting");
        Object second = factory.getBean("greeting");
        assertSame(first, second);
    }

    @Test
    void testUnregisteredBeanThrows() {
        BeanFactory factory = new BeanFactory();
        assertThrows(RuntimeException.class, () -> factory.getBean("nonexistent"));
    }

    @Test
    void testIndependentBeanSlots() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("a", Greeting.class));
        factory.registerBeanDefinition(new BeanDefinition("b", Greeting.class));
        Object a = factory.getBean("a");
        Object b = factory.getBean("b");
        assertNotNull(a);
        assertNotNull(b);
        assertNotSame(a, b);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/pack-spring-core/exercises/di-03-singleton-registry/hidden-tests
git commit -m "test(pack): add di-03 SingletonRegistryTest hidden test"
```

---

## Task 3: Author di-04 exercise bundle (yaml + starter + README)

**Files:**
- Create: `packages/pack-spring-core/exercises/di-04-constructor-di/exercise.yaml`
- Create: `packages/pack-spring-core/exercises/di-04-constructor-di/starter/BeanDefinition.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-04-constructor-di/starter/BeanFactory.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-04-constructor-di/starter/ConstructorResolver.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-04-constructor-di/starter/README.md`

- [ ] **Step 1: Create `exercise.yaml`**

```yaml
id: ex-di-04
sessionId: spring.di.04
title: "Constructor-Based Dependency Injection"
prompt: "Extend the BeanFactory with a ConstructorResolver that injects dependencies by inspecting constructor parameter types and recursively resolving them from registered BeanDefinitions"
templateVariables:
  packageName: "com.studyagent.exercise"
starterFiles:
  - path: "BeanDefinition.java"
    description: "Bean metadata (name + class)"
  - path: "BeanFactory.java"
    description: "Registers definitions and delegates to ConstructorResolver"
  - path: "ConstructorResolver.java"
    description: "Resolves constructor arguments by type via BeanFactory.getBean"
expectedArtifacts:
  - "BeanDefinition.java"
  - "BeanFactory.java"
  - "ConstructorResolver.java"
hints:
  - "Assume single-bean-per-type: to find a dependency by type, iterate registered BeanDefinitions and find the one whose beanClass matches"
  - "Call BeanFactory.getBean(depName) recursively — that naturally builds leaves first"
  - "Class.getDeclaredConstructors()[0] is enough; no @Autowired disambiguation"
  - "Make starter code assume public constructors; no setAccessible required"
```

- [ ] **Step 2: Create `starter/BeanDefinition.java.tmpl`** (independent copy — identical shape to di-03)

```java
package {{packageName}};

/**
 * Represents metadata about a bean before it is instantiated.
 * TODO: Add fields for bean name and bean class.
 * TODO: Add constructor and getters.
 */
public class BeanDefinition {
    // TODO: Implement bean metadata storage
}
```

- [ ] **Step 3: Create `starter/BeanFactory.java.tmpl`**

```java
package {{packageName}};

import java.util.Map;
import java.util.HashMap;

/**
 * BeanFactory with constructor-based DI.
 *  - registerBeanDefinition stores metadata
 *  - getBean(name) returns cached singleton; on cache miss, delegates to ConstructorResolver
 *    to build constructor arguments (recursively getBean-ing dependencies), instantiates, and caches
 *  - throws RuntimeException when the name or a dependency type has no matching BeanDefinition
 */
public class BeanFactory {
    // TODO: Implement:
    //  - Map<String, BeanDefinition> definitions
    //  - Map<String, Object> singletons
    //  - findDefinitionByType(Class<?>) : BeanDefinition (search registered definitions)
    //  - getBean(name): cache → resolver.resolve(this, def) → cache → return
}
```

- [ ] **Step 4: Create `starter/ConstructorResolver.java.tmpl`**

```java
package {{packageName}};

import java.lang.reflect.Constructor;

/**
 * Resolves a bean's constructor dependencies by type, using the BeanFactory for lookup.
 * TODO: Implement resolve(BeanFactory, BeanDefinition) that:
 *   1. Takes the first declared constructor (getDeclaredConstructors()[0])
 *   2. For each parameter type, asks BeanFactory for the bean of that type
 *      (BeanFactory must expose a "find by type" helper that resolves name, then getBean(name))
 *   3. Invokes constructor.newInstance(args...)
 */
public class ConstructorResolver {
    // TODO: Implement resolve
}
```

- [ ] **Step 5: Create `starter/README.md`**

```markdown
# Constructor-Based Dependency Injection Exercise

Extend the bean factory so it can create beans that depend on other beans via constructor injection.

## Requirements
1. `BeanDefinition` stores bean metadata (name, beanClass)
2. `BeanFactory.registerBeanDefinition(BeanDefinition)` stores the definition
3. `BeanFactory.getBean(String name)`:
   - Returns the cached singleton if present
   - On cache miss, delegates to `ConstructorResolver.resolve(factory, definition)` to build constructor arguments, instantiates the bean, caches it, returns it
4. `ConstructorResolver.resolve(BeanFactory, BeanDefinition)`:
   - Uses the first declared constructor of the bean class
   - For each parameter type, finds the registered BeanDefinition whose `beanClass` matches, then recursively calls `BeanFactory.getBean(depName)`
   - Returns the instantiated bean
5. Throws `RuntimeException` when:
   - `getBean(name)` is called for a name with no registered definition
   - A constructor parameter type has no matching definition
6. **Assumption:** single bean per type. If two definitions have the same `beanClass`, behavior is undefined (no qualifier/primary support).
7. Use public constructors; `setAccessible` is not required.
```

- [ ] **Step 6: Commit**

```bash
git add packages/pack-spring-core/exercises/di-04-constructor-di
git commit -m "feat(pack): add di-04 constructor-di exercise bundle"
```

---

## Task 4: Author di-04 hidden test

**Files:**
- Create: `packages/pack-spring-core/exercises/di-04-constructor-di/hidden-tests/ConstructorResolverTest.java`

- [ ] **Step 1: Create `hidden-tests/ConstructorResolverTest.java`**

```java
package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class LeafC {}

class MidB {
    final LeafC c;
    public MidB(LeafC c) { this.c = c; }
}

class TopA {
    final MidB b;
    public TopA(MidB b) { this.b = b; }
}

class Standalone {}

class ConstructorResolverTest {
    @Test
    void testZeroArgBean() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("standalone", Standalone.class));
        Object bean = factory.getBean("standalone");
        assertNotNull(bean);
        assertTrue(bean instanceof Standalone);
    }

    @Test
    void testSingleDependency() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("c", LeafC.class));
        factory.registerBeanDefinition(new BeanDefinition("b", MidB.class));
        MidB b = (MidB) factory.getBean("b");
        assertNotNull(b);
        assertNotNull(b.c);
    }

    @Test
    void testChainedDependency() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("c", LeafC.class));
        factory.registerBeanDefinition(new BeanDefinition("b", MidB.class));
        factory.registerBeanDefinition(new BeanDefinition("a", TopA.class));
        TopA a = (TopA) factory.getBean("a");
        assertNotNull(a);
        assertNotNull(a.b);
        assertNotNull(a.b.c);
    }

    @Test
    void testUnresolvedDependencyThrows() {
        BeanFactory factory = new BeanFactory();
        // Register A (which needs B) but do NOT register B
        factory.registerBeanDefinition(new BeanDefinition("a", TopA.class));
        assertThrows(RuntimeException.class, () -> factory.getBean("a"));
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/pack-spring-core/exercises/di-04-constructor-di/hidden-tests
git commit -m "test(pack): add di-04 ConstructorResolverTest hidden test"
```

---

## Task 5: Author quiz YAML authoring references for di-03 and di-04

**Files:**
- Create: `packages/pack-spring-core/quiz/di-03-singleton-registry.yaml`
- Create: `packages/pack-spring-core/quiz/di-04-constructor-di.yaml`

These are authoring references; runtime source of truth is the inline map (Task 6). Keep them in sync by hand.

- [ ] **Step 1: Create `quiz/di-03-singleton-registry.yaml`**

```yaml
id: quiz-di-03
sessionId: spring.di.03
passingScore: 60
normalizationRules:
  - type: case_insensitive
  - type: trim_whitespace
  - type: alias
    aliases:
      same: ["identical", "동일", "같다"]
gradedQuestions:
  - id: q1
    type: multiple_choice
    prompt: "Spring이 singleton bean을 재생성하지 않도록 보장하는 가장 핵심적인 자료구조는?"
    choices:
      - "A) 이름을 키로 이미 생성된 인스턴스를 저장하는 맵 (singleton cache)"
      - "B) BeanDefinition을 저장하는 리스트"
      - "C) ClassLoader 내부 static 필드"
      - "D) ThreadLocal"
    weight: 25
  - id: q2
    type: multiple_choice
    prompt: "BeanDefinition과 singleton instance를 분리해서 관리해 얻는 가장 직접적인 이득은?"
    choices:
      - "A) 컴파일 에러를 조기에 잡을 수 있다"
      - "B) bean을 실제로 필요할 때까지 생성을 지연할 수 있다 (lazy instantiation)"
      - "C) bean 이름을 중복 등록할 수 있다"
      - "D) JVM 메모리를 덜 사용한다"
    weight: 25
  - id: q3
    type: short_answer
    prompt: "같은 이름으로 getBean(\"foo\")을 두 번 호출했을 때 Spring의 기본 scope에서 돌려받는 두 객체의 관계를 한 단어로: ___"
    weight: 25
  - id: q4
    type: short_answer
    prompt: "같은 bean을 매번 새 인스턴스로 받고 싶을 때 지정하는 scope 이름은?"
    weight: 25
answerKey:
  answers:
    q1: "A"
    q2: "B"
    q3: "same"
    q4: "prototype"
reflectionQuestions:
  - id: r1
    prompt: "왜 Spring은 단순 new가 아니라 singleton registry로 bean을 관리할까?"
    rubric:
      - "Mentions lifecycle control or lazy instantiation"
      - "Mentions sharing the same instance across consumers"
    expectedPoints:
      - "Singleton caching lets dependency consumers share one instance and avoids re-construction"
      - "Managed lifecycle (eager/lazy init, scope) requires the container to own the object"
    feedbackHints:
      - "Think about what happens if every @Autowired call created a new object"
```

- [ ] **Step 2: Create `quiz/di-04-constructor-di.yaml`**

```yaml
id: quiz-di-04
sessionId: spring.di.04
passingScore: 60
normalizationRules:
  - type: case_insensitive
  - type: trim_whitespace
  - type: alias
    aliases:
      getdeclaredconstructors: ["getconstructors"]
      "c → b → a": ["c, b, a", "c b a", "c->b->a"]
gradedQuestions:
  - id: q1
    type: multiple_choice
    prompt: "생성자 기반 DI에서 Spring이 각 파라미터에 어떤 bean을 주입할지 결정하는 1차 기준은?"
    choices:
      - "A) 파라미터 이름"
      - "B) 파라미터 타입"
      - "C) 선언 순서"
      - "D) @Qualifier 값"
    weight: 25
  - id: q2
    type: short_answer
    prompt: "Class 객체에서 선언된 생성자 목록을 얻는 reflection API의 메서드 이름은? (메서드 이름만)"
    weight: 25
  - id: q3
    type: multiple_choice
    prompt: "생성자 DI가 setter/field DI 대비 갖는 주요 장점은?"
    choices:
      - "A) 런타임에 의존성을 바꿀 수 있다"
      - "B) 필수 의존성을 불변(final) 필드로 강제할 수 있다"
      - "C) 더 빠르다"
      - "D) 리플렉션이 필요 없다"
    weight: 25
  - id: q4
    type: short_answer
    prompt: "A(B b), B(C c)로 연결된 체인을 getBean(\"a\") 한 번으로 만들 때, 실제 인스턴스가 만들어지는 순서를 arrow(→)로 답하시오: ___"
    weight: 25
answerKey:
  answers:
    q1: "B"
    q2: "getDeclaredConstructors"
    q3: "B"
    q4: "C → B → A"
reflectionQuestions:
  - id: r1
    prompt: "circular dependency가 생성자 DI에서는 즉시 터지고 field/setter DI에서는 런타임 지연으로 발견되는 이유는 무엇일까?"
    rubric:
      - "Mentions constructor DI requires dependency to be ready at instantiation time"
      - "Mentions setter/field DI defers wiring until after object creation"
    expectedPoints:
      - "Constructor DI builds leaves first; a cycle means no leaf exists, so creation cannot start"
      - "Setter/field DI creates an empty object first, then wires — the cycle surfaces only when a wired method is called"
    feedbackHints:
      - "Think about when the object reference first exists"
```

- [ ] **Step 3: Commit**

```bash
git add packages/pack-spring-core/quiz/di-03-singleton-registry.yaml packages/pack-spring-core/quiz/di-04-constructor-di.yaml
git commit -m "docs(pack): add quiz authoring YAMLs for di-03 and di-04"
```

---

## Task 6: Extend `quiz-builder.ts` inline map (runtime source of truth)

**Files:**
- Modify: `packages/pack-spring-core/src/quiz-builder.ts`

- [ ] **Step 1: Add `spring.di.03` and `spring.di.04` entries to `QUIZ_SPECS`**

Open `packages/pack-spring-core/src/quiz-builder.ts`. After the existing `"spring.di.02": { ... }` block (before the closing `};` on line 150) insert the two new entries.

Insert this block right before the closing `};` of `QUIZ_SPECS`:

```typescript
  "spring.di.03": {
    id: "quiz-di-03",
    gradedQuestions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "Spring이 singleton bean을 재생성하지 않도록 보장하는 가장 핵심적인 자료구조는?",
        choices: [
          "A) 이름을 키로 이미 생성된 인스턴스를 저장하는 맵 (singleton cache)",
          "B) BeanDefinition을 저장하는 리스트",
          "C) ClassLoader 내부 static 필드",
          "D) ThreadLocal",
        ],
        weight: 25,
      },
      {
        id: "q2",
        type: "multiple_choice",
        prompt: "BeanDefinition과 singleton instance를 분리해서 관리해 얻는 가장 직접적인 이득은?",
        choices: [
          "A) 컴파일 에러를 조기에 잡을 수 있다",
          "B) bean을 실제로 필요할 때까지 생성을 지연할 수 있다 (lazy instantiation)",
          "C) bean 이름을 중복 등록할 수 있다",
          "D) JVM 메모리를 덜 사용한다",
        ],
        weight: 25,
      },
      {
        id: "q3",
        type: "short_answer",
        prompt: "같은 이름으로 getBean(\"foo\")을 두 번 호출했을 때 Spring의 기본 scope에서 돌려받는 두 객체의 관계를 한 단어로: ___",
        weight: 25,
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "같은 bean을 매번 새 인스턴스로 받고 싶을 때 지정하는 scope 이름은?",
        weight: 25,
      },
    ],
    reflectionQuestions: [
      {
        id: "r1",
        prompt: "왜 Spring은 단순 new가 아니라 singleton registry로 bean을 관리할까?",
        rubric: [
          "Mentions lifecycle control or lazy instantiation",
          "Mentions sharing the same instance across consumers",
        ],
        expectedPoints: [
          "Singleton caching lets dependency consumers share one instance and avoids re-construction",
          "Managed lifecycle (eager/lazy init, scope) requires the container to own the object",
        ],
        feedbackHints: ["Think about what happens if every @Autowired call created a new object"],
      },
    ],
    answerKey: {
      answers: {
        q1: "A",
        q2: "B",
        q3: "same",
        q4: "prototype",
      },
    },
    passingScore: 60,
    normalizationRules: [
      { type: "case_insensitive" },
      { type: "trim_whitespace" },
      {
        type: "alias",
        aliases: {
          "same": ["identical", "동일", "같다"],
        },
      },
    ],
  },
  "spring.di.04": {
    id: "quiz-di-04",
    gradedQuestions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "생성자 기반 DI에서 Spring이 각 파라미터에 어떤 bean을 주입할지 결정하는 1차 기준은?",
        choices: [
          "A) 파라미터 이름",
          "B) 파라미터 타입",
          "C) 선언 순서",
          "D) @Qualifier 값",
        ],
        weight: 25,
      },
      {
        id: "q2",
        type: "short_answer",
        prompt: "Class 객체에서 선언된 생성자 목록을 얻는 reflection API의 메서드 이름은? (메서드 이름만)",
        weight: 25,
      },
      {
        id: "q3",
        type: "multiple_choice",
        prompt: "생성자 DI가 setter/field DI 대비 갖는 주요 장점은?",
        choices: [
          "A) 런타임에 의존성을 바꿀 수 있다",
          "B) 필수 의존성을 불변(final) 필드로 강제할 수 있다",
          "C) 더 빠르다",
          "D) 리플렉션이 필요 없다",
        ],
        weight: 25,
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "A(B b), B(C c)로 연결된 체인을 getBean(\"a\") 한 번으로 만들 때, 실제 인스턴스가 만들어지는 순서를 arrow(→)로 답하시오: ___",
        weight: 25,
      },
    ],
    reflectionQuestions: [
      {
        id: "r1",
        prompt: "circular dependency가 생성자 DI에서는 즉시 터지고 field/setter DI에서는 런타임 지연으로 발견되는 이유는 무엇일까?",
        rubric: [
          "Mentions constructor DI requires dependency to be ready at instantiation time",
          "Mentions setter/field DI defers wiring until after object creation",
        ],
        expectedPoints: [
          "Constructor DI builds leaves first; a cycle means no leaf exists, so creation cannot start",
          "Setter/field DI creates an empty object first, then wires — the cycle surfaces only when a wired method is called",
        ],
        feedbackHints: ["Think about when the object reference first exists"],
      },
    ],
    answerKey: {
      answers: {
        q1: "B",
        q2: "getDeclaredConstructors",
        q3: "B",
        q4: "C → B → A",
      },
    },
    passingScore: 60,
    normalizationRules: [
      { type: "case_insensitive" },
      { type: "trim_whitespace" },
      {
        type: "alias",
        aliases: {
          "getdeclaredconstructors": ["getconstructors"],
          "c → b → a": ["c, b, a", "c b a", "c->b->a"],
        },
      },
    ],
  },
```

- [ ] **Step 2: Build the workspace**

Run: `pnpm build`
Expected: Build succeeds across the workspace (TypeScript compiles without errors).

- [ ] **Step 3: Commit**

```bash
git add packages/pack-spring-core/src/quiz-builder.ts
git commit -m "feat(pack): register quiz specs for spring.di.03 and spring.di.04"
```

---

## Task 7: Extend `exercise-builder.ts` registry

**Files:**
- Modify: `packages/pack-spring-core/src/exercise-builder.ts`

- [ ] **Step 1: Extend `SESSION_TO_EXERCISE`**

Locate the `SESSION_TO_EXERCISE` const (around line 17). Replace:

```typescript
const SESSION_TO_EXERCISE: Record<string, string> = {
  "spring.ioc.01": "di-01-ioc-bean-metadata",
  "spring.di.02": "di-02-bean-registration",
};
```

with:

```typescript
const SESSION_TO_EXERCISE: Record<string, string> = {
  "spring.ioc.01": "di-01-ioc-bean-metadata",
  "spring.di.02": "di-02-bean-registration",
  "spring.di.03": "di-03-singleton-registry",
  "spring.di.04": "di-04-constructor-di",
};
```

- [ ] **Step 2: Extend `hiddenTestFiles`**

Locate the `hiddenTestFiles` map (around line 48). Replace:

```typescript
  const hiddenTestFiles: Record<string, string[]> = {
    "di-01-ioc-bean-metadata": ["ContainerTest.java"],
    "di-02-bean-registration": ["RegistryTest.java"],
  };
```

with:

```typescript
  const hiddenTestFiles: Record<string, string[]> = {
    "di-01-ioc-bean-metadata": ["ContainerTest.java"],
    "di-02-bean-registration": ["RegistryTest.java"],
    "di-03-singleton-registry": ["SingletonRegistryTest.java"],
    "di-04-constructor-di": ["ConstructorResolverTest.java"],
  };
```

- [ ] **Step 3: Build the workspace**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Run unit + integration tests to confirm no regression**

Run: `pnpm test`
Expected: All existing tests pass. (The integration test `session-2-unlock-transition.test.ts` already expects `spring.di.03` to unlock after di-02 passes — that assertion should now hit a session with a real exercise bundle registered.)

- [ ] **Step 5: Commit**

```bash
git add packages/pack-spring-core/src/exercise-builder.ts
git commit -m "feat(pack): register di-03 and di-04 exercise bundles"
```

---

## Task 8: Hand-author golden-submissions for grade pass case

**Files (each fixture gets identical copies of rendered starter):**
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.03/BeanDefinition.java`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.03/SingletonBeanRegistry.java`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.03/BeanFactory.java`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.03/README.md`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.04/BeanDefinition.java`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.04/BeanFactory.java`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.04/ConstructorResolver.java`
- Create: `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.04/README.md`
- (Same set repeated under `tests/eval/fixtures/sample-spring-with-lifecycle/golden-submissions/`)

Each file is the rendered starter (replace `{{packageName}}` → `com.studyagent.exercise`). `README.md` is identical to the authored one (no template variables).

**Precedent:** `tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.02/SimpleBeanDefinitionRegistry.java` is the **unimplemented starter** (template comment `TODO: Implement registry logic` remains) — grade only checks file presence, so this is intentional. Match the same convention.

- [ ] **Step 1: Create di-03 golden submissions under `sample-spring-core`**

For each file, write exactly the starter content from Task 1 with `{{packageName}}` replaced by `com.studyagent.exercise`. Example for `BeanDefinition.java`:

```java
package com.studyagent.exercise;

/**
 * Represents metadata about a bean before it is instantiated.
 * TODO: Add fields for bean name and bean class.
 * TODO: Add constructor and getters.
 */
public class BeanDefinition {
    // TODO: Implement bean metadata storage
}
```

Repeat for `SingletonBeanRegistry.java` and `BeanFactory.java` (rendered forms of Task 1 Step 3 and Step 4). `README.md` is copied verbatim from Task 1 Step 5.

- [ ] **Step 2: Create di-04 golden submissions under `sample-spring-core`**

Same process for Task 3's four starter files, rendered with `com.studyagent.exercise`.

- [ ] **Step 3: Duplicate all 8 files under `sample-spring-with-lifecycle/golden-submissions/`**

```bash
cp -r tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.03 tests/eval/fixtures/sample-spring-with-lifecycle/golden-submissions/spring.di.03
cp -r tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.04 tests/eval/fixtures/sample-spring-with-lifecycle/golden-submissions/spring.di.04
```

- [ ] **Step 4: Commit**

```bash
git add tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.03 tests/eval/fixtures/sample-spring-core/golden-submissions/spring.di.04 tests/eval/fixtures/sample-spring-with-lifecycle/golden-submissions/spring.di.03 tests/eval/fixtures/sample-spring-with-lifecycle/golden-submissions/spring.di.04
git commit -m "test(eval): add golden submissions for di-03 and di-04"
```

---

## Task 9: Extend `AUTHORED_SESSIONS` (makes eval harness cover new sessions)

**Files:**
- Modify: `tests/eval/helpers/fixtures-list.ts`

- [ ] **Step 1: Run eval tests to confirm current state (pre-extension)**

Run: `pnpm test:eval`
Expected: All pass (di-03/di-04 are not yet in `AUTHORED_SESSIONS`, so they're not tested).

- [ ] **Step 2: Extend `AUTHORED_SESSIONS`**

Replace line 14 of `tests/eval/helpers/fixtures-list.ts`:

```typescript
export const AUTHORED_SESSIONS = ["spring.ioc.01", "spring.di.02"] as const;
```

with:

```typescript
export const AUTHORED_SESSIONS = [
  "spring.ioc.01",
  "spring.di.02",
  "spring.di.03",
  "spring.di.04",
] as const;
```

- [ ] **Step 3: Run eval tests to confirm they now fail for missing goldens**

Run: `pnpm test:eval`
Expected: Tests for `spring.di.03` and `spring.di.04` fail because `tests/eval/fixtures/*/expected/exercises/spring.di.03/…`, `…/quiz/spring.di.03/quiz.json`, `…/grade/spring.di.03.{passed,failing}.json` (and same for di.04) do not exist yet.

This failure is expected and is the gate before `UPDATE_GOLDEN=1`.

- [ ] **Step 4: Do NOT commit yet** — Task 10 generates the goldens and Task 11 reviews them. They ship together.

---

## Task 10: Generate goldens via `UPDATE_GOLDEN=1`

- [ ] **Step 1: Run golden update**

Run: `UPDATE_GOLDEN=1 pnpm test:eval`
Expected: All tests pass, and new golden files have been written under both fixtures' `expected/` trees.

- [ ] **Step 2: Verify new file set exists**

Run: `git status tests/eval/fixtures`
Expected output includes (for each of the two fixtures):
- `expected/exercises/spring.di.03/exercise-spec.json`
- `expected/exercises/spring.di.03/starter/BeanDefinition.java`
- `expected/exercises/spring.di.03/starter/SingletonBeanRegistry.java`
- `expected/exercises/spring.di.03/starter/BeanFactory.java`
- `expected/exercises/spring.di.03/starter/README.md`
- `expected/exercises/spring.di.04/exercise-spec.json`
- `expected/exercises/spring.di.04/starter/BeanDefinition.java`
- `expected/exercises/spring.di.04/starter/BeanFactory.java`
- `expected/exercises/spring.di.04/starter/ConstructorResolver.java`
- `expected/exercises/spring.di.04/starter/README.md`
- `expected/quiz/spring.di.03/quiz.json`
- `expected/quiz/spring.di.04/quiz.json`
- `expected/grade/spring.di.03.passed.json`
- `expected/grade/spring.di.03.failing.json`
- `expected/grade/spring.di.04.passed.json`
- `expected/grade/spring.di.04.failing.json`

Also check for diffs on **existing** files (most likely `expected/sessions.json` since sessions metadata may now include 3/4 as authored, and possibly `expected/analysis.json`/`expected/instantiated-dag.json` if they reflect authored flag). Any diff here is expected *only* if the shape reasonably depends on authoring.

- [ ] **Step 3: Do NOT commit yet — Task 11 reviews the diff.**

---

## Task 11: Review golden diff (DoD gate)

- [ ] **Step 1: Inspect the diff surface**

Run: `git diff --stat tests/eval/fixtures`
Expected: Changes confined to `expected/exercises/spring.di.03/`, `expected/exercises/spring.di.04/`, `expected/quiz/spring.di.03/`, `expected/quiz/spring.di.04/`, `expected/grade/spring.di.0{3,4}.*.json`, and at most `expected/sessions.json` / `expected/analysis.json` / `expected/instantiated-dag.json` entries related to the newly authored sessions. No churn in di-01/di-02/lifecycle-05/aop-06 artifacts.

- [ ] **Step 2: Sanity-check generated content**

Run: `git diff tests/eval/fixtures/sample-spring-core/expected/exercises/spring.di.03/exercise-spec.json`
Expected: JSON contains `"id": "ex-di-03"`, `"sessionId": "spring.di.03"`, `"title": "Singleton Bean Registry"`, `expectedArtifacts` lists the three Java files, `hiddenTestPlan.testFiles` is `["SingletonRegistryTest.java"]`.

Run: `git diff tests/eval/fixtures/sample-spring-core/expected/quiz/spring.di.03/quiz.json`
Expected: JSON contains `q1..q4` with correct prompts. Verify `answerKey` is NOT present (quiz.json is the public file; answer key lives in the private internal quiz).

Run: `git diff tests/eval/fixtures/sample-spring-core/expected/grade/spring.di.03.passed.json`
Expected: `"passed": true`, `"score": 100`, `"nextAction": "advance"`, rubric "All files present".

Run: `git diff tests/eval/fixtures/sample-spring-core/expected/grade/spring.di.03.failing.json`
Expected: `"passed": false`, score < 100, `"nextAction": "retry"`, feedback mentions exactly one missing file (the alphabetically-first artifact in the submission dir is the one removed by `grade.test.ts:37` — verify the filename matches what's alphabetically first among the golden-submission files).

If any content looks wrong, go back to the originating Task (1, 3, 5, 6, or 7) and fix — then regenerate goldens.

- [ ] **Step 3: Verify no private artifacts leaked**

Run: `grep -r "answerKey" tests/eval/fixtures/*/expected/quiz/`
Expected: **No matches.** answerKey belongs only to the internal quiz file, never to `.study-agent/quiz/*/quiz.json`.

If matches appear, the bug is in `artifact-writer.ts` or the engine's quiz materialization; escalate — do not hand-edit the golden.

- [ ] **Step 4: Commit golden + AUTHORED_SESSIONS extension together**

```bash
git add tests/eval/helpers/fixtures-list.ts tests/eval/fixtures
git commit -m "test(eval): extend AUTHORED_SESSIONS to di-03 and di-04 with goldens"
```

---

## Task 12: Update project docs (roadmap + CLAUDE.md)

**Files:**
- Modify: `agent_docs/mvp-roadmap.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `agent_docs/mvp-roadmap.md` Slice table**

In the slice table, replace the row for Slice 3b:

```markdown
| 3b — 세션 3~6 authoring | ⏳ next | 남은 세션 exercise/quiz bundle. Harness 위에서 `UPDATE_GOLDEN=1`로 갱신하며 진행 |
```

with two rows:

```markdown
| 3b — 세션 3~4 authoring | ✅ merged | `spring.di.03`, `spring.di.04` exercise + quiz bundle; AUTHORED_SESSIONS 확장 |
| 3c — 세션 5~6 authoring | ⏳ next | `spring.lifecycle.05`, `spring.aop.06` optional/advanced 세션 authoring |
```

- [ ] **Step 2: Update `CLAUDE.md` "지금 어디쯤인가" paragraph**

Replace:

```
MVP 1.0 (two-session unlock slice) 완료. Slice 3a(eval harness) merge 완료. 현재 진행 방향은 Slice 3b(세션 3~6 authoring). 상세는 `agent_docs/mvp-roadmap.md`.
```

with:

```
MVP 1.0 (two-session unlock slice) 완료. Slice 3a (eval harness), 3b (di-03/di-04 authoring) merge 완료. 4개 core 세션(ioc-01 → di-04)이 관통되며, 다음은 Slice 3c(lifecycle-05, aop-06 authoring, optional/advanced). 상세는 `agent_docs/mvp-roadmap.md`.
```

- [ ] **Step 3: Commit**

```bash
git add agent_docs/mvp-roadmap.md CLAUDE.md
git commit -m "docs: mark slice 3b complete, split 3c for lifecycle/aop authoring"
```

---

## Task 13: Final verification

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: All unit + integration tests pass.

- [ ] **Step 2: Full eval harness**

Run: `pnpm test:eval`
Expected: All eval golden tests pass (including new di-03 / di-04 artifacts and grade snapshots for both fixtures).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: All workspace packages compile without errors.

- [ ] **Step 4: DoD self-check**

Walk the spec's §8 DoD list. For each box, point at the commit or test that satisfies it:

- [ ] `pnpm test` passes — Task 13 Step 1
- [ ] `pnpm test:eval` passes — Task 13 Step 2
- [ ] `pnpm build` passes — Task 13 Step 3
- [ ] Four sessions authored — Tasks 1–7
- [ ] Unlock transition (di-02 → di-03, di-03 → di-04) — covered by existing `session-2-unlock-transition.test.ts` (passes unchanged in Step 1) plus manual note: with real bundles now registered, materialization also triggers (Task 7 Step 4).
- [ ] Private artifacts not leaked — Task 11 Step 3
- [ ] Eval golden diff reviewed — Task 11 Steps 1–2
- [ ] `agent_docs/mvp-roadmap.md`, `CLAUDE.md` updated — Task 12

- [ ] **Step 5: Open PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(pack): slice 3b — author di-03 singleton registry and di-04 constructor DI" --body "$(cat <<'EOF'
## Summary
- Authors `spring.di.03` (SingletonBeanRegistry) and `spring.di.04` (ConstructorResolver) — exercise bundles, hidden tests, quiz specs
- Registers new sessions in `exercise-builder` / `quiz-builder` inline maps
- Extends `AUTHORED_SESSIONS` so eval harness covers new artifacts
- Updates `agent_docs/mvp-roadmap.md` and `CLAUDE.md`; defers lifecycle-05/aop-06 to slice 3c

## Spec / Plan
- Spec: `docs/superpowers/specs/2026-04-13-slice-3b-sessions-3-4-authoring-design.md`
- Plan: `docs/superpowers/plans/2026-04-13-slice-3b-sessions-3-4-authoring.md`

## Golden diff scope
Changes confined to:
- `tests/eval/fixtures/*/expected/exercises/spring.di.0{3,4}/*`
- `tests/eval/fixtures/*/expected/quiz/spring.di.0{3,4}/quiz.json`
- `tests/eval/fixtures/*/expected/grade/spring.di.0{3,4}.{passed,failing}.json`
- Incremental updates to `sessions.json` / `analysis.json` / `instantiated-dag.json` where they surface authored-session metadata

No churn in di-01, di-02, lifecycle-05, aop-06 artifacts.

## Test plan
- [ ] `pnpm test` passes
- [ ] `pnpm test:eval` passes
- [ ] `pnpm build` passes
- [ ] `git grep answerKey tests/eval/fixtures/*/expected/quiz/` returns no matches
- [ ] Manual: eyeball one `quiz.json` and one `grade.*.json` per new session
EOF
)"
```

---

## Appendix: Post-merge cleanup (slice 3c prerequisites, non-blocking)

If Slice 3c will follow immediately, the reviewer may note:
- The YAML/inline-map drift risk grows with each new session. Slice 3c should consider switching runtime loading to YAML parsing (spec §10 extension path).
- Starter duplication between di-03 and di-04 (`BeanDefinition.java.tmpl`) is intentional per spec §3.3 — do not "dedupe" via shared templates without revisiting the isolation principle.
