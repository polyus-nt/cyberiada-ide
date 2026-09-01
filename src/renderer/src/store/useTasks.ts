import { create } from 'zustand';

import type { CatalogTask, TaskCatalog } from '../../../common/tasks';
import type { SimulationResult, SubmissionResult, TestVerdict } from '../types/InterpreterTypes';

export type TaskTestPhase = 'idle' | 'waiting' | 'running' | 'passed' | 'failed';

export interface TaskTestState {
  phase: TaskTestPhase;
  verdict?: TestVerdict;
  source?: 'trial' | 'submission';
}

interface DetailedTestResult {
  testId: string;
  verdict: TestVerdict;
  execution: SimulationResult;
}

interface TaskState {
  catalog: TaskCatalog;
  catalogLoaded: boolean;
  activeTaskId?: string;
  solutionMachineId?: string;
  solutionXml?: string;
  testStates: Record<string, TaskTestState>;
  detailedResult?: DetailedTestResult;
  submissionActive: boolean;
  submissionResult?: SubmissionResult;
  setCatalog: (catalog: TaskCatalog) => void;
  startTask: (taskId: string) => void;
  endTask: () => void;
  selectSolution: (machineId?: string, xml?: string) => void;
  invalidateSolutionResults: (xml?: string) => void;
  startTrial: (testId: string) => void;
  completeTrial: (testId: string, verdict: TestVerdict, execution: SimulationResult) => void;
  cancelTrial: (testId: string) => void;
  startSubmission: () => void;
  startSubmissionTest: (testId: string) => void;
  completeSubmissionTest: (verdict: TestVerdict) => void;
  completeSubmission: (result: SubmissionResult) => void;
  failOperation: () => void;
}

const emptyCatalog: TaskCatalog = { tasks: [], diagnostics: [], assetRootUrl: '' };

const taskStates = (task?: CatalogTask, phase: TaskTestPhase = 'idle') =>
  Object.fromEntries((task?.tests ?? []).map((test) => [test.id, { phase }]));

export const useTasks = create<TaskState>((set, get) => ({
  catalog: emptyCatalog,
  catalogLoaded: false,
  testStates: {},
  submissionActive: false,
  setCatalog: (catalog) => set({ catalog, catalogLoaded: true }),
  startTask: (taskId) => {
    const task = get().catalog.tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    set({
      activeTaskId: taskId,
      solutionMachineId: undefined,
      solutionXml: undefined,
      testStates: taskStates(task),
      detailedResult: undefined,
      submissionActive: false,
      submissionResult: undefined,
    });
  },
  endTask: () =>
    set({
      activeTaskId: undefined,
      solutionMachineId: undefined,
      solutionXml: undefined,
      testStates: {},
      detailedResult: undefined,
      submissionActive: false,
      submissionResult: undefined,
    }),
  selectSolution: (solutionMachineId, solutionXml) => {
    const state = get();
    if (state.solutionMachineId === solutionMachineId && state.solutionXml === solutionXml) return;
    const task = state.catalog.tasks.find((candidate) => candidate.id === state.activeTaskId);
    set({
      solutionMachineId,
      solutionXml,
      testStates: taskStates(task),
      detailedResult: undefined,
      submissionResult: undefined,
    });
  },
  invalidateSolutionResults: (solutionXml) => {
    const state = get();
    if (state.solutionXml === solutionXml) return;
    const task = state.catalog.tasks.find((candidate) => candidate.id === state.activeTaskId);
    set({
      solutionXml,
      testStates: taskStates(task),
      detailedResult: undefined,
      submissionResult: undefined,
    });
  },
  startTrial: (testId) =>
    set((state) => ({
      testStates: {
        ...state.testStates,
        [testId]: { phase: 'running', source: 'trial' },
      },
      detailedResult: undefined,
    })),
  completeTrial: (testId, verdict, execution) =>
    set((state) => ({
      testStates: {
        ...state.testStates,
        [testId]: { phase: verdict.status, verdict, source: 'trial' },
      },
      detailedResult: { testId, verdict, execution },
    })),
  cancelTrial: (testId) =>
    set((state) => ({
      testStates: { ...state.testStates, [testId]: { phase: 'idle' } },
    })),
  startSubmission: () => {
    const task = get().catalog.tasks.find((candidate) => candidate.id === get().activeTaskId);
    set({
      submissionActive: true,
      submissionResult: undefined,
      detailedResult: undefined,
      testStates: taskStates(task, 'waiting'),
    });
  },
  startSubmissionTest: (testId) =>
    set((state) => ({
      testStates: {
        ...state.testStates,
        [testId]: { phase: 'running', source: 'submission' },
      },
    })),
  completeSubmissionTest: (verdict) =>
    set((state) => ({
      testStates: {
        ...state.testStates,
        [verdict.testId]: { phase: verdict.status, verdict, source: 'submission' },
      },
    })),
  completeSubmission: (submissionResult) => set({ submissionActive: false, submissionResult }),
  failOperation: () =>
    set((state) => ({
      submissionActive: false,
      testStates: Object.fromEntries(
        Object.entries(state.testStates).map(([testId, testState]) => [
          testId,
          testState.phase === 'running' || testState.phase === 'waiting'
            ? { phase: 'idle' }
            : testState,
        ])
      ),
    })),
}));

export const getActiveTask = (state: TaskState): CatalogTask | undefined =>
  state.catalog.tasks.find((task) => task.id === state.activeTaskId);
