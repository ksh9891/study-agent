// ── Foundation ──

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

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  kind: "language-adapter" | "study-pack";
  supports?: string[];
}

// ── CodeModel ──

export interface CodeFile {
  path: string;
  language?: string;
  packageName?: string;
  imports?: string[];
  annotations?: string[];
  classes?: ClassInfo[];
}

export interface ClassInfo {
  name: string;
  kind: "class" | "interface" | "enum" | "annotation";
  extends?: string;
  implements?: string[];
  annotations?: string[];
  methods?: MethodInfo[];
}

export interface MethodInfo {
  name: string;
  annotations?: string[];
  returnType?: string;
}

export interface SymbolNode {
  name: string;
  kind: "class" | "interface" | "method" | "field" | "enum";
  file: string;
  lineStart: number;
  lineEnd: number;
}

export interface ReferenceEdge {
  from: string;
  to: string;
  kind: "import" | "call" | "extends" | "implements" | "annotation";
}

export interface CodeModel {
  language: string;
  files: CodeFile[];
  symbols: SymbolNode[];
  references: ReferenceEdge[];
  callGraph?: Array<{ caller: string; callee: string }>;
  dependencyGraph?: Array<{ from: string; to: string; scope?: string }>;
  metadata?: Record<string, unknown>;
}

export interface AdapterCapabilities {
  fileIndex: boolean;
  dependencies: boolean;
  annotations: boolean;
  imports: boolean;
  inheritance: boolean;
  shallowSymbols: boolean;
  references: boolean;
  callGraph: boolean;
}

export interface CodeModelResult {
  codeModel: CodeModel;
  capabilities: AdapterCapabilities;
}

// ── Evidence ──

export interface EvidenceRule {
  type: "annotation" | "dependency" | "import" | "class_usage" | "config_pattern" | "inheritance";
  pattern: string;
  weight?: number;
}

export interface EvidenceEntry {
  file: string;
  lineStart: number;
  lineEnd: number;
  pattern: string;
  ruleType?: string;
}

export interface CodeEvidence {
  file: string;
  lineStart: number;
  lineEnd: number;
  description: string;
}

export type EvidenceMap = Record<string, EvidenceEntry[]>;

// ── Concept Graph ──

export interface ConceptNode {
  id: string;
  title: string;
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  inclusionPolicy: "required" | "optional";
  stage?: "core" | "advanced";
  evidenceRules: EvidenceRule[];
  tags?: string[];
}

export interface ConceptEdge {
  from: string;
  to: string;
  kind: "prerequisite";
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

// ── Instantiated DAG ──

export interface InstantiatedConcept {
  conceptId: string;
  evidenceScore: number;
  evidenceEntries: EvidenceEntry[];
  inclusionReason: "required" | "evidence_threshold_met";
}

export interface ExcludedConcept {
  conceptId: string;
  evidenceScore: number;
  exclusionReason: "below_threshold" | "missing_prerequisite" | "capability_degraded";
}

export interface InstantiatedDAG {
  packId: string;
  repoContext: { repoName: string; rootPath: string };
  includedConcepts: InstantiatedConcept[];
  excludedConcepts: ExcludedConcept[];
  conceptOrder: string[];
}

// ── Session ──

export interface ExplanationOutlineItem {
  topic: string;
  codeAnchors: CodeEvidence[];
  notes?: string;
}

export interface UnlockRule {
  prerequisites: string[];
  requireExercise: boolean;
  requireQuiz: boolean;
  minQuizScore?: number;
}

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

// ── Exercise ──

export interface StarterFile {
  path: string;
  description: string;
}

export interface HiddenTestPlan {
  testFiles: string[];
  runner: string;
  command: string;
  args: string[];
  timeout?: number;
}

export interface ExerciseSpecInternal {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  templateBundle: string;
  templateVariables: Record<string, string>;
  starterFiles: StarterFile[];
  expectedArtifacts: string[];
  repoAnchors: CodeEvidence[];
  hiddenTestPlan: HiddenTestPlan;
  hints?: string[];
}

export interface ExerciseSpecPublic {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  starterFiles: StarterFile[];
  expectedArtifacts: string[];
  repoAnchors: CodeEvidence[];
  hints?: string[];
}

// ── Quiz ──

export interface GradedQuestion {
  id: string;
  type: "multiple_choice" | "short_answer" | "matching" | "ordering";
  prompt: string;
  choices?: string[];
  weight: number;
}

export interface ReflectionQuestion {
  id: string;
  prompt: string;
  rubric: string[];
  expectedPoints: string[];
  feedbackHints: string[];
}

export interface NormalizationRule {
  type: "case_insensitive" | "trim_whitespace" | "alias";
  aliases?: Record<string, string[]>;
}

export interface QuizAnswerKey {
  answers: Record<string, string | string[]>;
}

export interface QuizSpecInternal {
  id: string;
  sessionId: string;
  gradedQuestions: GradedQuestion[];
  reflectionQuestions?: ReflectionQuestion[];
  answerKey: QuizAnswerKey;
  passingScore: number;
  normalizationRules: NormalizationRule[];
}

export interface QuizSpecPublic {
  id: string;
  sessionId: string;
  gradedQuestions: GradedQuestion[];
  reflectionQuestions?: ReflectionQuestion[];
  passingScore: number;
}

// ── Evaluation ──

export interface RubricItemResult {
  criterion: string;
  passed: boolean;
  message?: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  rubric: RubricItemResult[];
  feedback: string[];
  nextAction?: "retry" | "review" | "advance";
}

// ── Test Strategy ──

export interface TestStrategy {
  runner: "gradle" | "maven" | "npm" | "custom";
  command: string;
  args: string[];
  workingDir?: string;
  timeout?: number;
  env?: Record<string, string>;
}

// ── Pack Requirements ──

export interface DegradationRule {
  capability: keyof AdapterCapabilities;
  action: "skip_concept" | "reduce_evidence" | "warn";
  message: string;
}

export interface PackRequirements {
  requiredCapabilities: Partial<AdapterCapabilities>;
  preferredCapabilities?: Partial<AdapterCapabilities>;
  degradationRules: DegradationRule[];
}

// ── Adapter / Pack Interfaces ──

export interface LanguageDetectResult {
  language: string;
  confidence: number;
  buildTool?: string;
  buildFile?: string;
}

export interface PackMatchResult {
  packId: string;
  score: number;
  confidence: number;
  signals: string[];
}

export interface LanguageAdapter {
  manifest: ExtensionManifest;
  detect(repo: RepoContext): Promise<LanguageDetectResult | null>;
  buildCodeModel(input: { repo: RepoContext }): Promise<CodeModelResult>;
  getTestStrategy(input: { repo: RepoContext }): Promise<TestStrategy>;
}

export interface StudyPack {
  manifest: ExtensionManifest;
  requirements: PackRequirements;

  detect(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    capabilities: AdapterCapabilities;
    language: LanguageDetectResult;
  }): Promise<PackMatchResult | null>;

  collectEvidence(input: {
    repo: RepoContext;
    codeModel: CodeModel;
  }): Promise<EvidenceMap>;

  instantiateDAG(input: {
    evidenceMap: EvidenceMap;
  }): Promise<InstantiatedDAG>;

  buildSessions(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    instantiatedDAG: InstantiatedDAG;
  }): Promise<StudySessionSpec[]>;

  buildExerciseSpec(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySessionSpec;
  }): Promise<ExerciseSpecInternal | null>;

  buildQuizSpec(input: {
    session: StudySessionSpec;
    exercise?: ExerciseSpecInternal | null;
  }): Promise<QuizSpecInternal | null>;

  evaluateSubmission(input: {
    session: StudySessionSpec;
    testResults: TestRunResult;
  }): Promise<EvaluationResult>;
}

export interface TestRunResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: Array<{ testName: string; message: string }>;
  duration: number;
}

// ── Progress ──

export type SessionStatus = "locked" | "available" | "in_progress" | "passed" | "failed";

export interface SessionProgress {
  status: SessionStatus;
  exercisePassed?: boolean;
  exerciseScore?: number;
  quizPassed?: boolean;
  quizScore?: number;
  lastAttempt?: string;
}

export interface ProgressData {
  schemaVersion: string;
  repo: string;
  packId: string;
  sessions: Record<string, SessionProgress>;
}
