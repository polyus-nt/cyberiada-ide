import { describe, expect, it } from 'vitest';

import type { GardenerStep } from '@renderer/types/InterpreterTypes';

import { createCyberBearState, rgbkColor } from './cyberBearModel';
import { applyRunState, finishRunState } from './liveState';

const step = (x: number): GardenerStep => ({
  position: { x, y: 0 },
  orientation: 'east',
  field: [[0, 0]],
});

describe('live platform state', () => {
  it('accumulates Gardener batches in order and keeps the final environment beyond the history limit', () => {
    const first = applyRunState(undefined, {
      platform: 'junior-gardener',
      environment: step(1),
      steps: [step(0), step(1)],
      historyTruncated: false,
    });
    const next = applyRunState(first, {
      platform: 'junior-gardener',
      environment: step(2),
      steps: Array.from({ length: 5000 }, (_, i) => step(i + 2)),
      historyTruncated: true,
    });
    expect(next?.steps).toHaveLength(5000);
    expect(next?.steps?.slice(0, 3).map((s) => s.position.x)).toEqual([0, 1, 2]);
    expect(next?.result?.environment?.position.x).toBe(2);
    expect(next?.warnings).toContain('EXECUTION_HISTORY_TRUNCATED');
    const finished = finishRunState(next, {
      status: 'cancelled',
      result: { signals: [], calledSignals: [], environment: step(6000) },
    });
    expect(finished.steps).toHaveLength(5000);
    expect(finished.result?.environment?.position.x).toBe(6000);
    expect(finished.warnings).toContain('EXECUTION_HISTORY_TRUNCATED');
  });

  it('appends Reader impulses during execution and uses the authoritative terminal output', () => {
    const first = applyRunState(undefined, {
      platform: 'junior-reader',
      impulses: ['impulseA', 'impulseB'],
    });
    const next = applyRunState(first, { platform: 'junior-reader', impulses: ['impulseC'] });
    expect(next?.status).toBe('running');
    expect(next?.result?.calledSignals).toEqual(['impulseA', 'impulseB', 'impulseC']);
    const finished = finishRunState(next, {
      status: 'success',
      result: { signals: [], calledSignals: ['impulseA', 'impulseB', 'impulseC'] },
    });
    expect(finished.result?.calledSignals).toHaveLength(3);
  });

  it('updates both CyberBear eyes and rejects malformed frames', () => {
    const bear = createCyberBearState();
    bear.eyes.left = [0, 5, 0, 5];
    const first = applyRunState(undefined, { platform: 'blg-mb-junior', cyberBear: bear });
    expect(first?.result?.cyberBear?.eyes.left).toEqual([0, 5, 0, 5]);
    expect(first?.result?.cyberBear?.eyes.right).toEqual([0, 0, 0, 0]);
    expect(
      applyRunState(first, { platform: 'blg-mb-junior', cyberBear: { ...bear, matrix: [] } })
    ).toBe(first);
  });

  it('converts RGBK time slices and darkness into visible channel intensities', () => {
    expect(rgbkColor([0, 0, 0, 0])).toBe('rgb(0, 0, 0)');
    expect(rgbkColor([10, 0, 0, 0])).toBe('rgb(255, 0, 0)');
    expect(rgbkColor([10, 0, 0, 10])).toBe('rgb(128, 0, 0)');
    expect(rgbkColor([10, 10, 10, 0])).toBe('rgb(255, 255, 255)');
  });
});

it('keeps session participants separate and preserves their history on completion', () => {
  let state = applyRunState(undefined, {
    platform: 'session',
    machines: {
      reader: { platform: 'junior-reader', impulses: ['impulseA', 'impulseB'] },
      gardener: {
        platform: 'junior-gardener',
        environment: step(1),
        steps: [step(0), step(1)],
        historyTruncated: false,
      },
    },
  });
  state = applyRunState(state, {
    platform: 'session',
    machines: {
      reader: { platform: 'junior-reader', impulses: ['impulseC'] },
      gardener: {
        platform: 'junior-gardener',
        environment: step(2),
        steps: [step(2)],
        historyTruncated: false,
      },
    },
  });
  const final = finishRunState(state, {
    status: 'success',
    machines: {
      reader: {
        status: 'success',
        result: { signals: [], calledSignals: ['impulseA', 'impulseB', 'impulseC'] },
      },
      gardener: {
        status: 'success',
        result: { signals: [], calledSignals: [], environment: step(2) },
      },
    },
  });
  expect(final.machines?.reader.result?.calledSignals).toEqual([
    'impulseA',
    'impulseB',
    'impulseC',
  ]);
  expect(final.machines?.gardener.steps).toEqual([step(0), step(1), step(2)]);
  expect(final.machines?.gardener.result?.environment).toEqual(step(2));
  expect(final.machines?.reader.steps).toBeUndefined();
});
