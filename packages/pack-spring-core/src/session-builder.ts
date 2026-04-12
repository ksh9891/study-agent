import type {
  RepoContext, CodeModel, InstantiatedDAG, StudySessionSpec,
  CodeEvidence, ExplanationOutlineItem, UnlockRule,
} from "@study-agent/engine-core";
import { getCanonicalDAG } from "./canonical-dag.js";

const SESSION_METADATA: Record<string, {
  learningGoals: string[];
  explanationTopics: string[];
  misconceptions: string[];
}> = {
  "spring.ioc.01": {
    learningGoals: [
      "Understand what Inversion of Control means",
      "Understand how Spring represents beans as metadata before instantiation",
      "Identify @Configuration and @Bean annotations in code",
    ],
    explanationTopics: [
      "What is IoC and why it matters",
      "BeanDefinition as metadata",
      "@Configuration and @Bean annotation roles",
    ],
    misconceptions: [
      "IoC is not just dependency injection — DI is one form of IoC",
      "@Bean does not create a bean immediately — it registers a definition",
    ],
  },
  "spring.di.02": {
    learningGoals: [
      "Understand how Spring registers bean definitions internally",
      "Understand the role of BeanDefinitionRegistry",
      "Trace the path from @Component scanning to registered BeanDefinition",
    ],
    explanationTopics: [
      "BeanDefinitionRegistry interface",
      "Component scanning process",
      "Registration vs instantiation",
    ],
    misconceptions: [
      "Component scanning does not create beans — it creates BeanDefinitions",
      "@ComponentScan only discovers, the registry stores",
    ],
  },
  "spring.di.03": {
    learningGoals: [
      "Understand how Spring creates bean instances from definitions",
      "Understand the singleton registry pattern",
    ],
    explanationTopics: ["Bean instantiation", "Singleton scope", "DefaultSingletonBeanRegistry"],
    misconceptions: ["Singleton in Spring is per-container, not per-JVM"],
  },
  "spring.di.04": {
    learningGoals: [
      "Understand constructor-based dependency injection",
      "Understand how Spring resolves constructor parameters",
    ],
    explanationTopics: ["Constructor injection", "Dependency resolution", "@Autowired behavior"],
    misconceptions: ["@Autowired is optional on single-constructor beans since Spring 4.3"],
  },
  "spring.lifecycle.05": {
    learningGoals: ["Understand bean lifecycle callbacks", "Understand BeanPostProcessor"],
    explanationTopics: ["@PostConstruct/@PreDestroy", "BeanPostProcessor interface", "Lifecycle phases"],
    misconceptions: ["@PostConstruct runs after DI, not after construction"],
  },
  "spring.aop.06": {
    learningGoals: ["Understand why Spring uses proxies", "Understand basic AOP concepts"],
    explanationTopics: ["Proxy pattern", "@Transactional as AOP", "AspectJ basics"],
    misconceptions: ["AOP proxies only work on Spring-managed beans"],
  },
};

export function buildSpringSessions(input: {
  repo: RepoContext;
  codeModel: CodeModel;
  instantiatedDAG: InstantiatedDAG;
}): StudySessionSpec[] {
  const dag = getCanonicalDAG();
  const sessions: StudySessionSpec[] = [];

  for (const conceptId of input.instantiatedDAG.conceptOrder) {
    const node = dag.nodes.find((n) => n.id === conceptId);
    if (!node) continue;

    const meta = SESSION_METADATA[conceptId];
    if (!meta) continue;

    const evidence = findEvidence(conceptId, input.codeModel, input.instantiatedDAG);
    const prerequisites = dag.edges
      .filter((e) => e.to === conceptId && input.instantiatedDAG.conceptOrder.includes(e.from))
      .map((e) => e.from);

    const session: StudySessionSpec = {
      id: conceptId,
      conceptId,
      title: node.title,
      learningGoals: meta.learningGoals,
      explanationOutline: meta.explanationTopics.map((topic) => ({
        topic,
        codeAnchors: evidence.slice(0, 2),
      })),
      evidence,
      misconceptions: meta.misconceptions,
      prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      unlockRule: {
        prerequisites,
        requireExercise: true,
        requireQuiz: true,
        minQuizScore: 60,
      },
    };

    sessions.push(session);
  }

  return sessions;
}

function findEvidence(
  conceptId: string,
  codeModel: CodeModel,
  dag: InstantiatedDAG,
): CodeEvidence[] {
  const concept = dag.includedConcepts.find((c) => c.conceptId === conceptId);
  if (!concept) return [];

  return concept.evidenceEntries.slice(0, 5).map((entry) => ({
    file: entry.file,
    lineStart: entry.lineStart,
    lineEnd: entry.lineEnd,
    description: `${entry.ruleType}: ${entry.pattern}`,
  }));
}
