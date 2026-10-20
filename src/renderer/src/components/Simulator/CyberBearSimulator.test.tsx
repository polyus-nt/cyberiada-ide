import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@renderer/components/UI', () => ({
  ParameterSelect: () => <select aria-label="Режим" />,
}));

import { createCyberBearState } from './cyberBearModel';
import { CyberBearSimulator } from './CyberBearSimulator';

describe('CyberBear simulator', () => {
  it('starts with the selected input and updates visual state during execution', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    const root = createRoot(container);
    const onStart = vi.fn();
    const props = {
      ready: true,
      active: false,
      stale: false,
      machineSelector: <span>Машина</span>,
      onStart,
      onCancel: vi.fn(),
    };
    try {
      act(() => root.render(<CyberBearSimulator {...props} />));
      const channel = container.querySelector<HTMLSelectElement>('#cyberbear-channel');
      const message = container.querySelector<HTMLTextAreaElement>('#cyberbear-message');
      if (!channel || !message) throw new Error('Missing CyberBear input controls');
      act(() => {
        channel.value = 'ears';
        Simulate.change(channel);
        message.value = 'МЁД';
        Simulate.change(message);
      });
      const start = container.querySelector('button');
      if (!start) throw new Error('Missing start button');
      act(() => start.click());
      expect(onStart).toHaveBeenCalledWith('finite', 10, { channel: 'ears', message: 'МЁД' });
      const state = createCyberBearState();
      state.eyes.right = [10, 0, 0, 10];
      state.matrix[6][4] = 75;
      act(() => root.render(<CyberBearSimulator {...props} active cyberBear={state} />));
      expect(container.textContent).toContain('Выполняется');
      expect(container.querySelector('svg')?.textContent).toContain('Правый глаз: 10, 0, 0, 10');
      expect(container.querySelector('svg')?.textContent).toContain('Строка 7, столбец 5: 75%');
      expect(channel.disabled).toBe(true);
      expect(message.disabled).toBe(true);
    } finally {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
