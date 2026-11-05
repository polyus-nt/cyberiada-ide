import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { expect, it, vi } from 'vitest';

import type { InterpreterEnvelope, TaskStartPayload } from '../../types/InterpreterTypes';

const client = vi.hoisted(() => ({
  ready: true,
  activeRunId: undefined as string | undefined,
  activeKind: undefined as 'submission' | undefined,
  capabilities: new Set(['task.session']),
  bind: vi.fn(),
  cancel: vi.fn(),
  listener: undefined as ((message: InterpreterEnvelope) => void) | undefined,
  subscribeMessages: vi.fn(),
  startSubmission: vi.fn(),
}));
vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: () => [undefined] }));
vi.mock('../Modules/Interpreter', () => ({ InterpreterClient: client }));

import { useInterpreter } from './useInterpreter';

import { useTasks } from '../../store/useTasks';

it('accepts submission results only while the submitted solution is still selected', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  client.subscribeMessages.mockImplementation((listener) => {
    client.listener = listener;
    return () => {
      client.listener = undefined;
    };
  });
  client.startSubmission.mockImplementation(() => {
    client.activeRunId = 'submission';
    client.activeKind = 'submission';
    return 'submission';
  });
  let runtime: ReturnType<typeof useInterpreter> | undefined;
  const getRuntime = () => {
    if (!runtime) throw new Error('Hook not mounted');
    return runtime;
  };
  const Harness = () => {
    runtime = useInterpreter();
    return null;
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  const emit = (type: InterpreterEnvelope['type'], payload: Record<string, unknown>) =>
    act(() => {
      client.listener?.({
        protocolVersion: 2,
        type,
        requestId: 'request',
        runId: 'submission',
        payload,
      });
    });
  const accepted = { status: 'accepted', passed: 1, total: 1, verdicts: [] };
  try {
    act(() => root.render(<Harness />));
    expect(getRuntime().supportsTaskSession).toBe(true);
    act(() => useTasks.getState().selectSolution('pair', '<xml/>'));
    act(() => getRuntime().startSubmission({ xml: '<xml/>' } as TaskStartPayload));
    emit('submission.completed', accepted);
    expect(useTasks.getState().submissionResult).toEqual(accepted);

    act(() => getRuntime().startSubmission({ xml: '<xml/>' } as TaskStartPayload));
    act(() => useTasks.getState().selectSolution('pair', undefined));
    emit('submission.test.started', { testId: 'example' });
    emit('submission.test.completed', { verdict: { testId: 'example', status: 'passed' } });
    emit('submission.completed', accepted);
    expect(useTasks.getState().submissionResult).toBeUndefined();
    expect(useTasks.getState().testStates.example).toBeUndefined();
    expect(useTasks.getState().submissionActive).toBe(false);
  } finally {
    act(() => root.unmount());
    useTasks.getState().endTask();
    vi.unstubAllGlobals();
  }
});
