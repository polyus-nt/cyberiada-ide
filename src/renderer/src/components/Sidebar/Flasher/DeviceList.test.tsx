import React, { createElement } from 'react';

import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArduinoDevice, UnknownDevice } from '@renderer/components/Modules/Device';
import { ClientStatus } from '@renderer/components/Modules/Websocket/ClientStatus';
import { useFlasher } from '@renderer/store/useFlasher';

import { DeviceList } from './DeviceList';

vi.mock('@renderer/assets/icons/update.svg', () => ({ ReactComponent: () => null }));
vi.mock('@renderer/components/UI', () => ({
  ScrollArea: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Modal: ({ children, submitDisabled }: React.PropsWithChildren<{ submitDisabled: boolean }>) => (
    <div>
      <button data-testid="submit" disabled={submitDisabled}>
        Добавить
      </button>
      {children}
    </div>
  ),
}));

vi.mock('@renderer/hooks', () => ({ usePortalZIndex: () => 400 }));
vi.mock('@renderer/assets/icons/arrow-down.svg', () => ({ ReactComponent: () => null }));

const unknown = new UnknownDevice({
  deviceID: 'serial:COM5',
  name: 'Неизвестная плата',
  portName: 'COM5',
} as UnknownDevice);

describe('DeviceList unknown ports', () => {
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
    useFlasher.setState({
      connectionStatus: ClientStatus.CONNECTED,
      boardProfiles: [],
      isFlashing: false,
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  const renderList = (allowUnknownSelection = false, device = unknown) => {
    act(() =>
      root.render(
        createElement(DeviceList, {
          isOpen: true,
          onClose: vi.fn(),
          onSubmit: vi.fn(),
          submitLabel: 'Добавить',
          devices: new Map([[device.deviceID, device]]),
          allowUnknownSelection,
        })
      )
    );
  };
  const choosePort = () =>
    act(() => {
      const button = [...host.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('COM5')
      );
      if (!button) throw new Error('Port button not found');
      button.click();
    });
  const submit = () => element<HTMLButtonElement>('[data-testid="submit"]');

  it('shows the unknown port and requires a board before adding it for flashing', () => {
    renderList();
    choosePort();
    expect(host.querySelector('[aria-pressed="true"]')?.textContent).toBe('COM5');
    expect(host.textContent).not.toContain('Неизвестная плата');
    expect(unknown.displaySerialName()).toBe('COM5');
    expect(submit().disabled).toBe(true);
    const assigned = new ArduinoDevice({
      ...unknown,
      name: 'Arduino Uno',
      profileID: 2,
      manuallyAssigned: true,
    } as unknown as ArduinoDevice);
    act(() =>
      root.render(
        createElement(DeviceList, {
          isOpen: true,
          onClose: vi.fn(),
          onSubmit: vi.fn(),
          submitLabel: 'Добавить',
          devices: new Map([[assigned.deviceID, assigned]]),
        })
      )
    );
    expect(submit().disabled).toBe(false);
    expect(host.querySelector('[aria-pressed="true"]')?.textContent).toBe('COM5 (Arduino Uno)');
    expect(assigned.displaySerialName()).toBe('COM5 (Arduino Uno)');
  });

  it('lets the serial monitor select a port without assigning a board', () => {
    renderList(true);
    choosePort();
    expect(submit().disabled).toBe(false);
  });
});
