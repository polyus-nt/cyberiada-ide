import Websocket from 'isomorphic-ws';
import { nanoid } from 'nanoid';

import {
  INTERPRETER_PROTOCOL_VERSION,
  InterpreterEnvelope,
  RunStartPayload,
  TaskStartPayload,
  TestStartPayload,
} from '@renderer/types/InterpreterTypes';

import { ClientStatus } from './Websocket/ClientStatus';
import { ClientWS } from './Websocket/ClientWS';

export class InterpreterClient extends ClientWS {
  static ready = false;
  static activeRunId: string | undefined;
  static activeKind: 'run' | 'test' | 'submission' | undefined;

  static async connect(host: string, port: number, autoReconnect = true) {
    const hasActiveConnection =
      this.isEqualAdress(host, port) &&
      this.connection !== undefined &&
      (this.connection.readyState === Websocket.OPEN ||
        this.connection.readyState === Websocket.CONNECTING);
    if (!hasActiveConnection) this.ready = false;
    return super.connect(host, port, autoReconnect);
  }

  static makeAddress(host: string, port: number): string {
    return `${super.makeAddress(host, port)}/ws`;
  }

  static onOpenHandler(): void {
    this.onStatusChange(ClientStatus.CONNECTING);
    this.setSecondsUntilReconnect(null);
  }

  static closeHandler(host: string, port: number, event: Websocket.CloseEvent): void {
    this.ready = false;
    this.activeRunId = undefined;
    this.activeKind = undefined;
    super.closeHandler(host, port, event);
  }

  static errorHandler(error: unknown): void {
    this.ready = false;
    this.activeRunId = undefined;
    this.activeKind = undefined;
    super.errorHandler(error);
  }

  static messageHandler(message: Websocket.MessageEvent): void {
    if (typeof message.data !== 'string') return;
    try {
      const envelope = JSON.parse(message.data) as InterpreterEnvelope;
      if (envelope.protocolVersion !== INTERPRETER_PROTOCOL_VERSION) return;
      if (envelope.type === 'connection.ready') {
        this.ready = true;
        this.onStatusChange(ClientStatus.CONNECTED);
      }
      if (
        envelope.runId === this.activeRunId &&
        (envelope.type === 'run.completed' ||
          envelope.type === 'run.cancelled' ||
          envelope.type === 'run.failed' ||
          envelope.type === 'test.completed' ||
          envelope.type === 'test.cancelled' ||
          envelope.type === 'submission.completed' ||
          envelope.type === 'error')
      ) {
        this.activeRunId = undefined;
        this.activeKind = undefined;
      }
      this.emitMessage(envelope);
    } catch (error) {
      console.error('Invalid interpreter message', error);
    }
  }

  static start(payload: RunStartPayload): string | undefined {
    if (!this.ready || this.activeRunId) return;
    const runId = nanoid();
    const envelope: InterpreterEnvelope<RunStartPayload> = {
      protocolVersion: INTERPRETER_PROTOCOL_VERSION,
      type: 'run.start',
      requestId: nanoid(),
      runId,
      payload,
    };
    if (!this.sendJson(envelope)) return;
    this.activeRunId = runId;
    this.activeKind = 'run';
    return runId;
  }

  private static startTaskOperation(
    type: 'test.start' | 'submission.start',
    payload: TestStartPayload | TaskStartPayload
  ): string | undefined {
    if (!this.ready || this.activeRunId) return;
    const runId = nanoid();
    if (
      !this.sendJson({
        protocolVersion: INTERPRETER_PROTOCOL_VERSION,
        type,
        requestId: nanoid(),
        runId,
        payload,
      } satisfies InterpreterEnvelope<TestStartPayload | TaskStartPayload>)
    ) {
      return;
    }
    this.activeRunId = runId;
    this.activeKind = type === 'test.start' ? 'test' : 'submission';
    return runId;
  }

  static startTest(payload: TestStartPayload): string | undefined {
    return this.startTaskOperation('test.start', payload);
  }

  static startSubmission(payload: TaskStartPayload): string | undefined {
    return this.startTaskOperation('submission.start', payload);
  }

  static cancel(runId: string): boolean {
    if (this.activeKind === 'submission') return false;
    return this.sendJson({
      protocolVersion: INTERPRETER_PROTOCOL_VERSION,
      type: 'run.cancel',
      requestId: nanoid(),
      runId,
      payload: {},
    } satisfies InterpreterEnvelope);
  }
}
