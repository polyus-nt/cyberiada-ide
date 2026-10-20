import type { RunStatePayload, SimulationResult } from '@renderer/types/InterpreterTypes';

import { isCyberBearState } from './cyberBearModel';

const HISTORY_LIMIT = 5000;

export const applyRunState = (
  previous: SimulationResult | undefined,
  update: RunStatePayload
): SimulationResult | undefined => {
  const current: SimulationResult = previous ?? {
    status: 'running',
    result: { signals: [], calledSignals: [] },
  };
  const result = current.result ?? { signals: [], calledSignals: [] };
  if (update.platform === 'blg-mb-junior') {
    if (!isCyberBearState(update.cyberBear)) return previous;
    return { ...current, result: { ...result, cyberBear: update.cyberBear } };
  }
  if (update.platform === 'junior-gardener') {
    const steps = [...(current.steps ?? []), ...update.steps].slice(0, HISTORY_LIMIT);
    const truncated =
      update.historyTruncated || (current.steps?.length ?? 0) + update.steps.length > HISTORY_LIMIT;
    return {
      ...current,
      steps,
      warnings: truncated ? ['EXECUTION_HISTORY_TRUNCATED'] : current.warnings,
      result: { ...result, environment: update.environment },
    };
  }
  if (update.platform === 'junior-reader') {
    return {
      ...current,
      result: { ...result, calledSignals: [...result.calledSignals, ...update.impulses] },
    };
  }
  return previous;
};

export const finishRunState = (
  current: SimulationResult | undefined,
  terminal: SimulationResult
): SimulationResult => ({
  ...terminal,
  ...(terminal.steps === undefined && current?.steps ? { steps: current.steps } : {}),
  warnings: [...new Set([...(current?.warnings ?? []), ...(terminal.warnings ?? [])])],
  result: terminal.result ?? current?.result,
});
