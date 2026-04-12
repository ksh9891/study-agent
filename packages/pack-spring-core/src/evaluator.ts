import type {
  StudySessionSpec, TestRunResult, EvaluationResult, RubricItemResult,
} from "@study-agent/engine-core";

export function evaluateSpringSubmission(input: {
  session: StudySessionSpec;
  testResults: TestRunResult;
}): EvaluationResult {
  const rubric: RubricItemResult[] = [];
  const feedback: string[] = [];

  rubric.push({
    criterion: "Tests executed successfully",
    passed: input.testResults.totalTests > 0,
    message: input.testResults.totalTests > 0
      ? `${input.testResults.totalTests} tests executed`
      : "No tests were executed",
  });

  const allPassed = input.testResults.passed;
  rubric.push({
    criterion: "All hidden tests pass",
    passed: allPassed,
    message: allPassed
      ? `All ${input.testResults.passedTests} tests passed`
      : `${input.testResults.failedTests} of ${input.testResults.totalTests} tests failed`,
  });

  for (const fail of input.testResults.failures) {
    feedback.push(`FAIL: ${fail.testName} — ${fail.message}`);
  }

  const score = input.testResults.totalTests > 0
    ? Math.round((input.testResults.passedTests / input.testResults.totalTests) * 100)
    : 0;

  const passed = allPassed && score >= 100;

  if (passed) {
    feedback.push("All tests passed. Well done!");
  } else if (score > 0) {
    feedback.push(`${score}% of tests passed. Review the failing tests and try again.`);
  } else {
    feedback.push("No tests passed. Check that your implementation compiles and follows the exercise requirements.");
  }

  return {
    passed,
    score,
    rubric,
    feedback,
    nextAction: passed ? "advance" : (score > 50 ? "retry" : "review"),
  };
}
