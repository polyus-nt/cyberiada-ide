import { useCallback, useEffect, useRef, useState } from 'react';

import { useSettings } from '@renderer/hooks/useSettings';
import { useTasks } from '@renderer/store/useTasks';
import {
  InterpreterEnvelope,
  RunStartPayload,
  SimulationResult,
  SubmissionResult,
  TaskStartPayload,
  TestStartPayload,
  TestVerdict,
} from '@renderer/types/InterpreterTypes';

import { InterpreterClient } from '../Modules/Interpreter';
import { ClientStatus } from '../Modules/Websocket/ClientStatus';

export const useInterpreter = () => {
  const [settings] = useSettings('interpreter');
  const [status, setStatus] = useState(
    InterpreterClient.ready ? ClientStatus.CONNECTED : ClientStatus.NO_CONNECTION
  );
  const [activeRunId, setActiveRunId] = useState(InterpreterClient.activeRunId);
  const [operationKind, setOperationKind] = useState(InterpreterClient.activeKind);
  const activeTestId = useRef<string>();
  const activeTaskXml = useRef<string>();
  const [result, setResult] = useState<SimulationResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    InterpreterClient.bind(
      (nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus === ClientStatus.NO_CONNECTION) {
          setActiveRunId(undefined);
          setOperationKind(undefined);
          useTasks.getState().failOperation();
          activeTestId.current = undefined;
          activeTaskXml.current = undefined;
        }
      },
      () => undefined
    );
    setStatus(InterpreterClient.ready ? ClientStatus.CONNECTED : ClientStatus.NO_CONNECTION);

    const unsubscribe = InterpreterClient.subscribeMessages<InterpreterEnvelope>((message) => {
      if (message.type === 'run.started') return;
      if (message.type === 'run.cancel.accepted') return;
      if (message.type === 'test.started' || message.type === 'test.cancel.accepted') return;
      if (message.type === 'submission.started') return;
      if (message.type === 'submission.test.started') {
        const payload = message.payload as { testId: string };
        useTasks.getState().startSubmissionTest(payload.testId);
        return;
      }
      if (message.type === 'submission.test.completed') {
        const payload = message.payload as { verdict: TestVerdict };
        useTasks.getState().completeSubmissionTest(payload.verdict);
        return;
      }
      if (message.type === 'error') {
        const payload = message.payload as { message?: string };
        setError(payload.message ?? 'Интерпретатор вернул ошибку');
        setActiveRunId(InterpreterClient.activeRunId);
        setOperationKind(InterpreterClient.activeKind);
        useTasks.getState().failOperation();
        activeTestId.current = undefined;
        activeTaskXml.current = undefined;
        return;
      }
      if (message.type === 'test.completed') {
        const payload = message.payload as { verdict: TestVerdict; execution: SimulationResult };
        if (useTasks.getState().solutionXml === activeTaskXml.current) {
          useTasks
            .getState()
            .completeTrial(payload.verdict.testId, payload.verdict, payload.execution);
        }
        activeTestId.current = undefined;
        activeTaskXml.current = undefined;
        setActiveRunId(InterpreterClient.activeRunId);
        setOperationKind(InterpreterClient.activeKind);
        return;
      }
      if (message.type === 'test.cancelled') {
        if (activeTestId.current) useTasks.getState().cancelTrial(activeTestId.current);
        activeTestId.current = undefined;
        activeTaskXml.current = undefined;
        setActiveRunId(InterpreterClient.activeRunId);
        setOperationKind(InterpreterClient.activeKind);
        return;
      }
      if (message.type === 'submission.completed') {
        useTasks.getState().completeSubmission(message.payload as SubmissionResult);
        setActiveRunId(InterpreterClient.activeRunId);
        setOperationKind(InterpreterClient.activeKind);
        return;
      }
      if (
        message.type === 'run.completed' ||
        message.type === 'run.cancelled' ||
        message.type === 'run.failed'
      ) {
        setResult(message.payload as SimulationResult);
        setActiveRunId(InterpreterClient.activeRunId);
        setOperationKind(InterpreterClient.activeKind);
      }
    });
    return () => {
      unsubscribe();
      if (InterpreterClient.activeRunId && InterpreterClient.activeKind !== 'submission') {
        InterpreterClient.cancel(InterpreterClient.activeRunId);
      }
    };
  }, []);

  useEffect(() => {
    if (!settings || settings.localPort <= 0) return;
    void InterpreterClient.connect(settings.localHost, settings.localPort);
  }, [settings]);

  const start = useCallback((payload: RunStartPayload) => {
    setError(undefined);
    setResult(undefined);
    const runId = InterpreterClient.start(payload);
    if (runId) setActiveRunId(runId);
    if (runId) setOperationKind('run');
    else setError('Интерпретатор ещё не готов к запуску');
  }, []);

  const startTest = useCallback((payload: TestStartPayload) => {
    setError(undefined);
    const runId = InterpreterClient.startTest(payload);
    if (!runId) {
      setError('Интерпретатор ещё не готов к запуску');
      return;
    }
    activeTestId.current = payload.testId;
    activeTaskXml.current = payload.xml;
    setActiveRunId(runId);
    setOperationKind('test');
    useTasks.getState().startTrial(payload.testId);
  }, []);

  const startSubmission = useCallback((payload: TaskStartPayload) => {
    setError(undefined);
    const runId = InterpreterClient.startSubmission(payload);
    if (!runId) {
      setError('Интерпретатор ещё не готов к запуску');
      return;
    }
    setActiveRunId(runId);
    setOperationKind('submission');
    useTasks.getState().startSubmission();
  }, []);

  const cancel = useCallback(() => {
    if (activeRunId) InterpreterClient.cancel(activeRunId);
  }, [activeRunId]);

  const clear = useCallback(() => {
    setResult(undefined);
    setError(undefined);
  }, []);

  return {
    status,
    ready: status === ClientStatus.CONNECTED && InterpreterClient.ready,
    active: activeRunId !== undefined,
    operationKind,
    result,
    error,
    start,
    startTest,
    startSubmission,
    cancel,
    clear,
  };
};
