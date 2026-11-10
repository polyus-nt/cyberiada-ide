import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, expect, it, vi } from 'vitest';

import { useWindowManagerStore } from '@renderer/hooks/useWindowManagerStore';

import { Window } from './MovingWindow';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useWindowManagerStore.setState({ windows: [], activeWindowId: null });
});

it('keeps an opened, expanded and resized window inside its visible parent', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let notifyResize = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
  vi.stubGlobal('innerWidth', 1366);
  vi.stubGlobal('innerHeight', 768);

  let width = 900;
  let height = 440;
  let parentHeight = 718;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(container);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return (
      this === container
        ? { left: 0, top: 50, width: 1366, height: parentHeight }
        : { width, height }
    ) as DOMRect;
  });

  const render = (isOpen: boolean) =>
    act(() =>
      root.render(
        <Window id="state" isOpen={isOpen} position={{ x: 900, y: 500 }}>
          State editor
        </Window>
      )
    );

  try {
    render(true);
    const element = container.querySelector<HTMLElement>('[data-window-id="state"]')!;
    expect(element.style.left).toBe('466px');
    expect(element.style.top).toBe('278px');
    expect(element.style.getPropertyValue('--moving-window-max-height')).toBe('718px');

    // Opening the condition or matrix changes the window after it is already visible.
    height = 680;
    act(() => notifyResize());
    expect(element.style.top).toBe('38px');

    // The editor's parent can shrink without a browser resize event.
    parentHeight = 650;
    height = 650;
    act(() => notifyResize());
    expect(element.style.top).toBe('0px');
    expect(element.style.getPropertyValue('--moving-window-max-height')).toBe('650px');

    vi.stubGlobal('innerWidth', 800);
    vi.stubGlobal('innerHeight', 600);
    width = 800;
    height = 550;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(element.style.left).toBe('0px');
    expect(element.style.top).toBe('0px');
    expect(element.style.getPropertyValue('--moving-window-max-width')).toBe('800px');
    expect(element.style.getPropertyValue('--moving-window-max-height')).toBe('550px');

    render(false);
    expect(disconnect).toHaveBeenCalledOnce();
    render(true);
    expect(element.style.top).toBe('0px');
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
