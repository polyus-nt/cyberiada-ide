import { describe, expect, it } from 'vitest';

import {
  CyberBearInputDraft,
  cyberBearInputError,
  cyberBearInputValue,
  rgbkColor,
  swapCyberBearInputs,
} from './cyberBearModel';

const draft = (value: string, timeMs = '0'): CyberBearInputDraft => ({
  id: 'input',
  channel: 'ears',
  timeMs,
  value,
});

describe('CyberBear input values', () => {
  it('swaps distant bytes and channels while keeping the time at each position', () => {
    const inputs: CyberBearInputDraft[] = [
      { id: 'a', value: '0xAA', channel: 'ir', timeMs: '100' },
      { id: 'b', value: '42', channel: 'ears', timeMs: '200' },
      { id: 'c', value: '255', channel: 'ears', timeMs: '500' },
    ];
    const result = swapCyberBearInputs(inputs, 0, 2);
    expect(result).toEqual([
      { ...inputs[2], timeMs: '100' },
      inputs[1],
      { ...inputs[0], timeMs: '500' },
    ]);
    expect(inputs.map(({ id, timeMs }) => [id, timeMs])).toEqual([
      ['a', '100'],
      ['b', '200'],
      ['c', '500'],
    ]);
    expect(swapCyberBearInputs(result, 2, 0)).toEqual(inputs);
  });

  it('changes the order for equal times and preserves unedited draft time text', () => {
    const inputs = [
      { ...draft('1', '100'), id: 'a' },
      { ...draft('2', '100'), id: 'b' },
    ];
    expect(swapCyberBearInputs(inputs, 0, 1).map(({ id }) => id)).toEqual(['b', 'a']);
    inputs[0].timeMs = '';
    inputs[1].timeMs = '00100';
    expect(swapCyberBearInputs(inputs, 0, 1).map(({ timeMs }) => timeMs)).toEqual(['', '00100']);
    expect(swapCyberBearInputs(inputs, 0, 0)).toBe(inputs);
    expect(swapCyberBearInputs(inputs, 0, -1)).toBe(inputs);
  });

  it('accepts decimal and hexadecimal bytes including both bounds', () => {
    for (const [text, byte] of [
      ['0', 0],
      ['255', 255],
      ['0xFF', 255],
      ['42', 42],
    ] as const) {
      expect(cyberBearInputError(draft(text))).toBeUndefined();
      expect(cyberBearInputValue(draft(text))).toEqual({ channel: 'ears', byte, timeMs: 0 });
    }
    for (const text of ['', '-1', '256', '1.5', '1e2', 'text', '0x100']) {
      expect(cyberBearInputError(draft(text))).toBeTruthy();
    }
  });

  it('validates absolute times and converts them to milliseconds', () => {
    for (const timeMs of ['0', '500', '1500', '9007199254740991']) {
      expect(cyberBearInputError(draft('42', timeMs))).toBeUndefined();
      expect(cyberBearInputValue(draft('42', timeMs))).toEqual({
        channel: 'ears',
        byte: 42,
        timeMs: Number(timeMs),
      });
    }
    for (const timeMs of ['', '-1', '1.5', '1e2', 'Infinity', '9007199254740992']) {
      expect(cyberBearInputError(draft('42', timeMs))).toBeTruthy();
    }
    expect(cyberBearInputError(draft('М'))).toBeTruthy();
  });
});

describe('CyberBear device palette', () => {
  it('shows lime as yellow-green and keeps equivalent RGBK proportions consistent', () => {
    expect(rgbkColor([6, 4, 0, 0])).toBe('rgb(191, 255, 0)');
    expect(rgbkColor([12, 8, 0, 0])).toBe('rgb(191, 255, 0)');
    expect(rgbkColor([6, 4, 0, 10])).toBe('rgb(96, 128, 0)');
  });

  it('matches named palette colours instead of interpreting timings as RGB intensities', () => {
    expect(rgbkColor([21, 1, 0, 0])).toBe('rgb(255, 128, 0)');
    expect(rgbkColor([10, 2, 0, 0])).toBe('rgb(255, 255, 0)');
    expect(rgbkColor([15, 4, 1, 0])).toBe('rgb(255, 255, 255)');
    expect(rgbkColor([0, 0, 0, 99])).toBe('rgb(0, 0, 0)');
  });
});
