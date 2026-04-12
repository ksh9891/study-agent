import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatSuccess, formatError } from "../helpers/output.js";
import { ProgressStore } from "@study-agent/engine-core";
import type { QuizSpecInternal, NormalizationRule, StudySessionSpec } from "@study-agent/engine-core";

export async function gradeQuizCommand(repoPath: string, sessionId: string, answersFile: string): Promise<string> {
  const quizInternalPath = join(repoPath, ".study-agent-internal", "quiz", sessionId, "quiz.internal.json");
  if (!existsSync(quizInternalPath)) {
    return formatError("grade-quiz", repoPath, "QUIZ_NOT_FOUND", `No quiz spec for session ${sessionId}`);
  }
  if (!existsSync(answersFile)) {
    return formatError("grade-quiz", repoPath, "ANSWERS_NOT_FOUND", `Answers file not found: ${answersFile}`);
  }

  const quizSpec: QuizSpecInternal = JSON.parse(readFileSync(quizInternalPath, "utf-8"));
  const userAnswers: { answers: Array<{ questionId: string; answer: string }> } = JSON.parse(readFileSync(answersFile, "utf-8"));

  let totalWeight = 0;
  let earnedWeight = 0;
  const results: Array<{ questionId: string; correct: boolean; userAnswer: string; expected?: string }> = [];

  for (const question of quizSpec.gradedQuestions) {
    totalWeight += question.weight;
    const userEntry = userAnswers.answers.find((a) => a.questionId === question.id);
    const userAnswer = userEntry?.answer ?? "";
    const correctAnswer = quizSpec.answerKey.answers[question.id];
    const isCorrect = matchAnswer(userAnswer, correctAnswer, quizSpec.normalizationRules);

    if (isCorrect) earnedWeight += question.weight;
    results.push({
      questionId: question.id,
      correct: isCorrect,
      userAnswer,
      expected: isCorrect ? undefined : String(correctAnswer),
    });
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const quizPassed = score >= quizSpec.passingScore;

  const publicDir = join(repoPath, ".study-agent");
  const progressStore = new ProgressStore(publicDir);

  // Update quiz sub-result
  const currentProgress = progressStore.load();
  const currentSession = currentProgress?.sessions[sessionId];
  progressStore.updateSessionStatus(sessionId, "in_progress", {
    exercisePassed: currentSession?.exercisePassed,
    exerciseScore: currentSession?.exerciseScore,
    quizPassed,
    quizScore: score,
  });

  const result: Record<string, unknown> = { passed: quizPassed, score, passingScore: quizSpec.passingScore, results };

  // Check if overall session is now passed
  if (quizPassed) {
    const sessionsPath = join(publicDir, "sessions.json");
    if (existsSync(sessionsPath)) {
      const sessionsData = JSON.parse(readFileSync(sessionsPath, "utf-8"));
      const sessions: StudySessionSpec[] = sessionsData.sessions;
      const session = sessions.find((s) => s.id === sessionId);

      if (session?.unlockRule) {
        const updatedProgress = progressStore.load();
        const sessionProgress = updatedProgress?.sessions[sessionId];
        if (sessionProgress && progressStore.isSessionPassed(sessionProgress, session.unlockRule)) {
          progressStore.updateSessionStatus(sessionId, "passed", {
            exercisePassed: sessionProgress.exercisePassed,
            exerciseScore: sessionProgress.exerciseScore,
            quizPassed: sessionProgress.quizPassed,
            quizScore: sessionProgress.quizScore,
          });
          const unlocked = progressStore.checkAndUnlock(sessions);
          result.unlockedSessions = unlocked;
        }
      }
    }
  }

  return formatSuccess("grade-quiz", repoPath, result);
}

function matchAnswer(
  userAnswer: string,
  correctAnswer: string | string[],
  rules: NormalizationRule[],
): boolean {
  const candidates = typeof correctAnswer === "string" ? [correctAnswer] : correctAnswer;

  for (const candidate of candidates) {
    let normalized = userAnswer;
    let correctNormalized = candidate;

    for (const rule of rules) {
      if (rule.type === "case_insensitive") {
        normalized = normalized.toLowerCase();
        correctNormalized = correctNormalized.toLowerCase();
      }
      if (rule.type === "trim_whitespace") {
        normalized = normalized.trim();
        correctNormalized = correctNormalized.trim();
      }
    }

    if (normalized === correctNormalized) return true;

    for (const rule of rules) {
      if (rule.type === "alias" && rule.aliases) {
        const aliases = rule.aliases[correctNormalized.toLowerCase()] ?? [];
        if (aliases.some((a) => a.toLowerCase() === normalized.toLowerCase())) return true;
      }
    }
  }

  return false;
}
