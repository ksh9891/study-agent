import type {
  StudySessionSpec, ExerciseSpecInternal,
  QuizSpecInternal,
} from "@study-agent/engine-core";

// MVP: Quiz specs are hardcoded inline, matching the YAML files in quiz/.
// The YAML files serve as the canonical source-of-truth for authoring;
// a proper YAML parser (e.g. `yaml` npm package) should replace this
// hardcoded approach when additional quiz files are added.

const QUIZ_SPECS: Record<string, Omit<QuizSpecInternal, "sessionId">> = {
  "spring.ioc.01": {
    id: "quiz-di-01",
    gradedQuestions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "What is the primary purpose of Inversion of Control (IoC) in Spring?",
        choices: [
          "A) To make code run faster",
          "B) To transfer control of object creation from application code to a framework/container",
          "C) To invert the order of method calls",
          "D) To reverse the class hierarchy",
        ],
        weight: 25,
      },
      {
        id: "q2",
        type: "short_answer",
        prompt: "In Spring, what is the name of the metadata object that describes a bean before it is instantiated?",
        weight: 25,
      },
      {
        id: "q3",
        type: "multiple_choice",
        prompt: "Which annotation marks a class as a source of bean definitions in Spring?",
        choices: ["A) @Component", "B) @Configuration", "C) @Service", "D) @Autowired"],
        weight: 25,
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "What is the default scope of a Spring bean?",
        weight: 25,
      },
    ],
    reflectionQuestions: [
      {
        id: "r1",
        prompt: "Why does Spring separate bean metadata (BeanDefinition) from actual bean instances?",
        rubric: ["Mentions separation of definition from instantiation", "Mentions lazy creation or lifecycle control"],
        expectedPoints: [
          "BeanDefinition allows the container to know about beans before creating them",
          "Enables lazy initialization, scope management, and dependency resolution",
        ],
        feedbackHints: ["Think about what the container needs to know before it can create a bean"],
      },
    ],
    answerKey: {
      answers: {
        q1: "B",
        q2: "BeanDefinition",
        q3: "B",
        q4: "singleton",
      },
    },
    passingScore: 60,
    normalizationRules: [
      { type: "case_insensitive" },
      { type: "trim_whitespace" },
    ],
  },
  "spring.di.02": {
    id: "quiz-di-02",
    gradedQuestions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "What is the primary role of BeanDefinitionRegistry in Spring?",
        choices: [
          "A) To create bean instances",
          "B) To store and manage bean definitions before instantiation",
          "C) To inject dependencies into beans",
          "D) To handle bean lifecycle callbacks",
        ],
        weight: 25,
      },
      {
        id: "q2",
        type: "short_answer",
        prompt: "What does a ComponentScanner do when it encounters a class annotated with @Component?",
        weight: 25,
      },
      {
        id: "q3",
        type: "multiple_choice",
        prompt: "What is the key difference between bean registration and bean instantiation?",
        choices: [
          "A) They are the same thing",
          "B) Registration stores metadata (BeanDefinition), instantiation creates the actual object",
          "C) Registration creates objects, instantiation stores metadata",
          "D) Registration happens at runtime, instantiation at compile time",
        ],
        weight: 25,
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "In our exercise, ComponentScanner.scan() takes an explicit Class[] list instead of scanning a package. What is the practical reason for this simplification?",
        weight: 25,
      },
    ],
    reflectionQuestions: [
      {
        id: "r1",
        prompt: "Why does Spring separate bean registration (storing BeanDefinitions) from bean creation (instantiation)?",
        rubric: [
          "Mentions separation of metadata from actual objects",
          "Mentions benefits like lazy init, scope control, or dependency ordering",
        ],
        expectedPoints: [
          "The container needs to know all beans before creating any, so it can resolve dependencies",
          "Separation enables lazy initialization, scope management, and circular dependency detection",
        ],
        feedbackHints: ["Think about what happens when Bean A depends on Bean B which depends on Bean C"],
      },
    ],
    answerKey: {
      answers: {
        q1: "B",
        q2: "BeanDefinition",
        q3: "B",
        q4: ["classpath scanning", "avoid classpath scanning"],
      },
    },
    passingScore: 60,
    normalizationRules: [
      { type: "case_insensitive" },
      { type: "trim_whitespace" },
      {
        type: "alias",
        aliases: {
          "beandefinition": ["creates a BeanDefinition", "registers a BeanDefinition", "creates a bean definition and registers it"],
          "classpath scanning": ["no classpath scanning needed", "avoid classpath scanning complexity", "classpath scanning is complex in Java"],
          "avoid classpath scanning": ["classpath scanning is complex", "simplifies testing", "no need for real classpath"],
        },
      },
    ],
  },
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
};

export function buildSpringQuizSpec(input: {
  session: StudySessionSpec;
  exercise?: ExerciseSpecInternal | null;
}): QuizSpecInternal | null {
  const spec = QUIZ_SPECS[input.session.id];
  if (!spec) return null;

  return {
    ...spec,
    sessionId: input.session.id,
  };
}
