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

export type CyberBearChannel = 'ir' | 'ears';
export type CyberBearInput = { channel: CyberBearChannel; byte: number; timeMs: number };
export type CyberBearParameters = { inputs: CyberBearInput[] };
export type RGBK = [number, number, number, number];
export type CyberBearState = {
  eyes: { right: RGBK; left: RGBK };
  matrix: number[][];
};

export type SessionStatePayload = {
  platform: 'session';
  machines: Record<string, RunStatePayload>;
};

export type RunStatePayload =
  | SessionStatePayload
  | { platform: 'blg-mb-junior'; cyberBear: CyberBearState }
  | {
      platform: 'junior-gardener';
      environment: GardenerStep;
      steps: GardenerStep[];
      historyTruncated: boolean;
    }
  | { platform: 'junior-reader'; impulses: string[] };

export type MachineParameters = GardenerParameters | ReaderParameters | CyberBearParameters;

export type RunStartPayload = {
  xml: string;
  mode: SimulationMode;
  live?: boolean;
  timeoutSeconds?: number;
} & (
  | { machineId: string; parameters: MachineParameters; machines?: never }
  | {
      machines: { machineId: string; parameters: MachineParameters }[];
      machineId?: never;
      parameters?: never;
    }
);

export type TaskStartPayload = {
  live?: boolean;
  xml: string;
  machineId?: string;
  machines?: { reader: string; gardener: string };
  task: ProgrammingTask;
};

export type TestStartPayload = TaskStartPayload & { testId: string };

export type TestFailureCode =
  | 'CHECK_FAILED'
  | 'TIMEOUT'
  | 'GARDENER_CRASH'
  | 'EXECUTION_ERROR'
  | 'CHECKER_ERROR';

export type TestVerdict = {
  testId: string;
  status: 'passed' | 'failed';
  reasonCode?: TestFailureCode;
  failedCheckType?: VerificationCheck['type'];
  message?: string;
  timeMs?: number;
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
  machines?: Record<string, SimulationResult>;
  steps?: GardenerStep[];
  warnings?: string[];
  result?: {
    signals: string[];
    calledSignals: string[];
    timeout?: boolean;
    environment?: GardenerStep;
    cyberBear?: CyberBearState;
    trace?: { timeMs: number; kind: string; state?: CyberBearState; [key: string]: unknown }[];
  };
  code?: string;
};
