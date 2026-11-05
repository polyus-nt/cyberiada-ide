import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';

import bodySource from '@renderer/assets/cyberbear/body.svg?raw';

import { createCyberBearState } from './cyberBearModel';
import { CyberBearView } from './CyberBearView';

describe('CyberBear artwork', () => {
  it('keeps all 35 dark sockets in the body without the example illumination', () => {
    const body = new DOMParser().parseFromString(bodySource, 'image/svg+xml');
    expect(body.querySelector('parsererror')).toBeNull();
    expect(body.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 253 381');
    expect(body.querySelectorAll('path[fill="#344957"]').length).toBe(35);
    expect(body.querySelector('[fill="#21E5AD"], [fill="#22E8B0"], [fill="#24E3AD"]')).toBeNull();
  });

  it('updates each light independently and switches back off without replacing the body', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    const root = createRoot(container);
    const state = createCyberBearState();
    const light = (row: number, column: number) =>
      container.querySelector(`[data-led="${row}:${column}"] image`);
    const pupil = (side: string) => container.querySelectorAll(`[data-eye="${side}"] path`)[2];
    const glow = (side: string) => container.querySelector(`[data-eye="${side}"] path`);

    try {
      act(() => root.render(<CyberBearView state={state} />));
      const body = container.querySelector('image');
      const firstLight = light(0, 0);
      expect(container.querySelectorAll('[data-led]').length).toBe(35);
      expect(
        Array.from(container.querySelectorAll('[data-led] image')).every(
          (image) => image.getAttribute('opacity') === '0'
        )
      ).toBe(true);
      expect(pupil('right').getAttribute('fill')).toBe('rgb(0, 0, 0)');
      expect(glow('right')?.getAttribute('opacity')).toBe('0');
      expect(glow('left')?.getAttribute('opacity')).toBe('0');

      state.matrix[0][0] = 100;
      state.matrix[3][2] = 50;
      state.matrix[6][4] = 1;
      state.eyes.right = [10, 0, 0, 10];
      state.eyes.left = [0, 0, 10, 0];
      act(() => root.render(<CyberBearView state={state} />));

      expect(light(0, 0)?.getAttribute('opacity')).toBe('1');
      expect(light(3, 2)?.getAttribute('opacity')).toBe('0.5');
      expect(light(6, 4)?.getAttribute('opacity')).toBe('0.01');
      expect(light(0, 1)?.getAttribute('opacity')).toBe('0');
      expect(pupil('right').getAttribute('fill')).toBe('rgb(128, 0, 0)');
      expect(pupil('left').getAttribute('fill')).toBe('rgb(0, 0, 255)');
      expect(glow('right')?.getAttribute('opacity')).toBe('0.075');
      expect(glow('left')?.getAttribute('opacity')).toBe('0.15');
      expect(Number(light(6, 4)?.getAttribute('x'))).toBeGreaterThan(
        Number(firstLight?.getAttribute('x'))
      );
      expect(Number(light(6, 4)?.getAttribute('y'))).toBeGreaterThan(
        Number(firstLight?.getAttribute('y'))
      );

      act(() => root.render(<CyberBearView state={createCyberBearState()} />));
      expect(container.querySelector('image')).toBe(body);
      expect(light(0, 0)).toBe(firstLight);
      expect(light(0, 0)?.getAttribute('opacity')).toBe('0');
      expect(light(3, 2)?.getAttribute('opacity')).toBe('0');
      expect(light(6, 4)?.getAttribute('opacity')).toBe('0');
      expect(pupil('right').getAttribute('fill')).toBe('rgb(0, 0, 0)');
      expect(pupil('left').getAttribute('fill')).toBe('rgb(0, 0, 0)');
      expect(glow('right')?.getAttribute('opacity')).toBe('0');
      expect(glow('left')?.getAttribute('opacity')).toBe('0');
    } finally {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
