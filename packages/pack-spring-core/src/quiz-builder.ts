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
