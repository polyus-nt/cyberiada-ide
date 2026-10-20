import type { ProgrammingTask, VerificationCheck } from '../../../common/tasks';
import type {
  GardenerCell,
  GardenerOrientation,
  GardenerPosition,
} from '../components/Simulator/model';

export const INTERPRETER_PROTOCOL_VERSION = 2 as const;

export type SimulationMode = 'finite' | 'endless';

export type GardenerParameters = {
  width: number;
  height: number;
  field: GardenerCell[][];
  position: GardenerPosition;
  orientation: Uppercase<GardenerOrientation>;
};

export type ReaderParameters = {
  message: string;
};

export type CyberBearParameters = { message: string; channel: 'ir' | 'ears' };
export type RGBK = [number, number, number, number];
export type CyberBearState = {
  eyes: { right: RGBK; left: RGBK };
  matrix: number[][];
};

export type RunStatePayload =
  | { platform: 'blg-mb-junior'; cyberBear: CyberBearState }
  | {
      platform: 'junior-gardener';
      environment: GardenerStep;
      steps: GardenerStep[];
      historyTruncated: boolean;
    }
  | { platform: 'junior-reader'; impulses: string[] };

export type RunStartPayload = {
  xml: string;
  machineId: string;
  mode: SimulationMode;
  live?: boolean;
  timeoutSeconds?: number;
  parameters: GardenerParameters | ReaderParameters | CyberBearParameters;
};

export type TaskStartPayload = {
  live?: boolean;
  xml: string;
  machineId: string;
  task: ProgrammingTask;
};

export type TestStartPayload = TaskStartPayload & { testId: string };

export type TestFailureCode = 'CHECK_FAILED' | 'TIMEOUT' | 'GARDENER_CRASH' | 'EXECUTION_ERROR';

export type TestVerdict = {
  testId: string;
  status: 'passed' | 'failed';
  reasonCode?: TestFailureCode;
  failedCheckType?: VerificationCheck['type'];
  outcome: Omit<SimulationResult, 'steps'>;
};

export type SubmissionResult = {
  status: 'accepted' | 'not-accepted';
  passed: number;
  total: number;
  verdicts: TestVerdict[];
};

export type InterpreterRequestType = 'run.start' | 'run.cancel' | 'test.start' | 'submission.start';
export type InterpreterResponseType =
  | 'connection.ready'
  | 'run.started'
  | 'run.state'
  | 'run.cancel.accepted'
  | 'run.completed'
  | 'run.cancelled'
  | 'run.failed'
  | 'test.started'
  | 'test.cancel.accepted'
  | 'test.completed'
  | 'test.cancelled'
  | 'submission.started'
  | 'submission.test.started'
  | 'submission.test.completed'
  | 'submission.completed'
  | 'error';

export interface InterpreterEnvelope<TPayload = Record<string, unknown>> {
  protocolVersion: typeof INTERPRETER_PROTOCOL_VERSION;
  type: InterpreterRequestType | InterpreterResponseType;
  requestId: string;
  runId?: string;
  payload: TPayload;
}

export type GardenerStep = {
  position: GardenerPosition;
  orientation: GardenerOrientation;
  field: GardenerCell[][];
};

export type SimulationResult = {
  status: 'running' | 'success' | 'timeout' | 'cancelled' | 'crash' | 'error';
  message?: string;
  steps?: GardenerStep[];
  warnings?: string[];
  result?: {
    signals: string[];
    calledSignals: string[];
    timeout?: boolean;
    environment?: GardenerStep;
    cyberBear?: CyberBearState;
  };
  code?: string;
};
