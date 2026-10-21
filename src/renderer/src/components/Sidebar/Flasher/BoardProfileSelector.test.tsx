import { createElement } from 'react';

import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArduinoDevice, UnknownDevice } from '@renderer/components/Modules/Device';
import { Flasher } from '@renderer/components/Modules/Flasher';
import { useFlasher } from '@renderer/store/useFlasher';

import { BoardProfileSelector } from './BoardProfileSelector';

const unknown = new UnknownDevice({
  deviceID: 'serial:COM5',
  name: 'Неизвестная плата',
  portName: 'COM5',
} as UnknownDevice);

describe('BoardProfileSelector', () => {
  let host: HTMLDivElement;
  let root: Root;
  const element = <T extends Element>(selector: string): T => {
    const found = host.querySelector<T>(selector);
    if (!found) throw new Error(`Element not found: ${selector}`);
    return found;
  };
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    useFlasher.setState({ boardProfiles: [{ id: 2, name: 'Arduino Uno' }], isFlashing: false });
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('assigns Uno to the selected port and shows server errors', async () => {
    const assign = vi
      .spyOn(Flasher, 'setBoardProfile')
      .mockRejectedValue(new Error('Закройте монитор порта'));
    act(() => root.render(createElement(BoardProfileSelector, { device: unknown })));
    const select = element<HTMLSelectElement>('select');
    act(() => {
      select.value = '2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => element<HTMLButtonElement>('button').click());
    expect(assign).toHaveBeenCalledWith('serial:COM5', 2);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Закройте монитор порта');
  });

  it('can restore automatic detection for an assigned board', async () => {
    const assign = vi.spyOn(Flasher, 'setBoardProfile').mockResolvedValue();
    const arduino = new ArduinoDevice({
      ...unknown,
      name: 'Arduino Uno',
      profileID: 2,
      manuallyAssigned: true,
    } as unknown as ArduinoDevice);
    act(() => root.render(createElement(BoardProfileSelector, { device: arduino })));
    const select = element<HTMLSelectElement>('select');
    expect(select.value).toBe('2');
    act(() => {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => element<HTMLButtonElement>('button').click());
    expect(assign).toHaveBeenCalledWith('serial:COM5', null);
  });

  it('disables assignment while flashing', () => {
    useFlasher.setState({ isFlashing: true });
    act(() => root.render(createElement(BoardProfileSelector, { device: unknown })));
    expect(element<HTMLSelectElement>('select').disabled).toBe(true);
    expect(element<HTMLButtonElement>('button').disabled).toBe(true);
  });
});
