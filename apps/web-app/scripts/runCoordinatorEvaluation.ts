import {
  coordinatorEvaluationCorpus,
} from './coordinatorEvaluationCorpus.ts'
import {
  formatCoordinatorEvaluationReport,
  runCoordinatorEvaluation,
} from './coordinatorEvaluationRunner.ts'

const report = await runCoordinatorEvaluation(coordinatorEvaluationCorpus)

console.log(formatCoordinatorEvaluationReport(report))

const failures = report.cases.filter((result) => !result.passed)
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.id}: ${failure.errors.join(' ')}`)
  }
  process.exitCode = 1
}
