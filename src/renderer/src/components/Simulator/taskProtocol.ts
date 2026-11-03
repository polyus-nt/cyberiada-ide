import type { CatalogTask, ProgrammingTask } from '../../../../common/tasks';

export const taskForProtocol = (task: CatalogTask): ProgrammingTask => ({
  schemaVersion: task.schemaVersion,
  id: task.id,
  ...(task.checker
    ? { checker: { apiVersion: task.checker.apiVersion, source: task.checker.source } }
    : {}),
  version: task.version,
  title: task.title,
  summary: task.summary,
  description: task.description,
  platformId: task.platformId,
  tests: task.tests.map((test) => ({
    id: test.id,
    title: test.title,
    ...(test.timeoutSeconds === undefined ? {} : { timeoutSeconds: test.timeoutSeconds }),
    input: test.input,
    ...(test.parameters === undefined ? {} : { parameters: test.parameters }),
    ...(test.hideInputs === undefined ? {} : { hideInputs: test.hideInputs }),
    checks: test.checks,
  })),
});
