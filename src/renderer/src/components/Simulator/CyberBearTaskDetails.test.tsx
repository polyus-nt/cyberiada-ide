import { createElement } from 'react';

import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { expect, it, vi } from 'vitest';

import { createCyberBearState } from './cyberBearModel';
import { CyberBearTaskDetails } from './CyberBearTaskDetails';

import type { VerificationTest } from '../../../../common/tasks';

it('pages through long input sequences and resets the page for another test', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  const root = createRoot(container);
  const test: VerificationTest = {
    id: 'bytes',
    title: 'Байты',
    input: {
      durationMs: 1000,
      inputs: Array.from({ length: 10 }, (_, index) => ({
        channel: 'ir' as const,
        byte: 200 + index,
        timeMs: index * 100,
      })),
    },
    checks: [{ type: 'python' }],
  };
  const next = () => {
    const button = container.querySelector<HTMLButtonElement>(
      '[aria-label="Следующие входные байты"]'
    );
    if (!button) throw new Error('Missing next page');
    act(() => button.click());
  };
  try {
    act(() => root.render(createElement(CyberBearTaskDetails, { test })));
    expect(container.querySelectorAll('tbody tr').length).toBe(6);
    expect(container.querySelector('tbody')?.textContent).toContain('200');
    expect(container.querySelector('tbody')?.textContent).not.toContain('209');
    next();
    expect(container.querySelectorAll('tbody tr').length).toBe(4);
    expect(container.querySelector('tbody')?.textContent).toContain('209');
    expect(container.querySelector('tbody')?.textContent).not.toContain('200');
    expect(
      container.querySelector<HTMLButtonElement>('[aria-label="Следующие входные байты"]')?.disabled
    ).toBe(true);

    act(() => root.render(createElement(CyberBearTaskDetails, { test: { ...test, id: 'other' } })));
    expect(container.querySelector('tbody')?.textContent).toContain('200');
    expect(
      container.querySelector<HTMLButtonElement>('[aria-label="Предыдущие входные байты"]')
        ?.disabled
    ).toBe(true);
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});

it('replays observed states while hiding input bytes in two-level tasks', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  const root = createRoot(container);
  const first = createCyberBearState();
  const second = createCyberBearState();
  second.eyes.right = [14, 0, 0, 0];
  const test: VerificationTest = {
    id: 'message',
    title: 'Сообщение',
    hideInputs: true,
    input: { durationMs: 2000, inputs: [{ channel: 'ir', byte: 231, timeMs: 1000 }] },
    checks: [{ type: 'python' }],
  };
  try {
    act(() =>
      root.render(
        createElement(CyberBearTaskDetails, {
          test,
          execution: {
            status: 'success',
            result: {
              signals: [],
              calledSignals: [],
              trace: [
                { kind: 'state', timeMs: 0, state: first },
                { kind: 'state', timeMs: 1000, state: second },
              ],
            },
          },
        })
      )
    );
    expect(container.textContent).toContain('1000 мс');
    expect(container.textContent).toContain('14, 0, 0, 0');
    expect(container.textContent).not.toContain('231');
    expect(container.textContent).toContain('Входные байты скрыты');
    const slider = container.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider) throw new Error('Missing history slider');
    act(() => {
      slider.value = '0';
      Simulate.change(slider);
    });
    expect(container.textContent).toContain('Время: 0 мс');
    expect(container.textContent).not.toContain('14, 0, 0, 0');
    expect(container.querySelector('button')?.type).toBe('button');
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
