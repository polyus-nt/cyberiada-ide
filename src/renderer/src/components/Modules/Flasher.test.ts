import Websocket from 'isomorphic-ws';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFlasher } from '@renderer/store/useFlasher';

import { ArduinoDevice, UnknownDevice } from './Device';
import { Flasher } from './Flasher';

const message = (type: string, payload: unknown) =>
  ({ data: JSON.stringify({ type, payload }) } as Websocket.MessageEvent);

export const unknownPort = () =>
  new UnknownDevice({
    deviceID: 'serial:COM5',
    name: 'Неизвестная плата',
    portName: 'COM5',
    serialID: '',
    vendorID: '1A86',
    productID: '7523',
  } as UnknownDevice);

describe('manual board selection protocol', () => {
  beforeEach(() => {
    Flasher.setFlasherMessage = vi.fn();
    useFlasher.getState().setBoardProfiles([]);
  });
  afterEach(() => {
    Flasher.connection = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('receives profiles without replacing a device notification', async () => {
    await Flasher.messageHandler(message('unknown-device', unknownPort()));
    await Flasher.messageHandler(message('board-profiles', [{ id: 2, name: 'Arduino Uno' }]));
    expect(useFlasher.getState().boardProfiles).toEqual([{ id: 2, name: 'Arduino Uno' }]);
    expect(Flasher.setFlasherMessage).toHaveBeenCalledTimes(1);
  });

  it('waits for acknowledgement of the requested port and keeps the device update', async () => {
    const send = vi.fn();
    Flasher.connection = { readyState: Websocket.OPEN, send } as unknown as Websocket;
    const pending = Flasher.setBoardProfile('serial:COM5', 2);
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({
      type: 'set-board-profile',
      payload: { deviceID: 'serial:COM5', profileID: 2 },
    });
    await Flasher.messageHandler(
      message('device', { deviceID: 'serial:COM5', name: 'Arduino Uno' })
    );
    await Flasher.messageHandler(
      message('board-profile-result', { deviceID: 'another-port', code: 1, comment: 'busy' })
    );
    await Flasher.messageHandler(
      message('board-profile-result', { deviceID: 'serial:COM5', code: 0 })
    );
    await expect(pending).resolves.toBeUndefined();
    expect(Flasher.setFlasherMessage).toHaveBeenCalledTimes(1);
  });

  it('shows rejection from the server', async () => {
    Flasher.connection = { readyState: Websocket.OPEN, send: vi.fn() } as unknown as Websocket;
    const pending = Flasher.setBoardProfile('serial:COM5', null);
    const rejected = expect(pending).rejects.toThrow('Закройте монитор порта');
    await Flasher.messageHandler(
      message('board-profile-result', {
        deviceID: 'serial:COM5',
        code: 1,
        comment: 'Закройте монитор порта',
      })
    );
    await rejected;
  });

  it('fails promptly when disconnected and times out a lost response', async () => {
    await expect(Flasher.setBoardProfile('serial:COM5', 2)).rejects.toThrow(
      'Отсутствует подключение'
    );
    vi.useFakeTimers();
    Flasher.connection = { readyState: Websocket.OPEN, send: vi.fn() } as unknown as Websocket;
    const rejected = expect(Flasher.setBoardProfile('serial:COM5', 2)).rejects.toThrow(
      'не ответил'
    );
    await vi.advanceTimersByTimeAsync(10000);
    await rejected;
  });

  it('blocks unclassified ports before preparing a flash', () => {
    const unknown = unknownPort();
    expect(unknown.displayName()).toContain('COM5');
    expect(unknown.getSerialPort()).toBe('COM5');
    expect(() => Flasher.flashPreparation(unknown)).toThrow('Выберите плату');
    const assigned = new ArduinoDevice({
      ...unknown,
      name: 'Arduino Uno',
      profileID: 2,
      manuallyAssigned: true,
    } as unknown as ArduinoDevice);
    expect(assigned.isArduinoDevice()).toBe(true);
    expect(assigned.profileID).toBe(2);
    expect(assigned.manuallyAssigned).toBe(true);
  });
});
