import { describe, expect, it } from 'vitest';

import {
  CyberBearInputDraft,
  cyberBearInputError,
  cyberBearInputValue,
  rgbkColor,
} from './cyberBearModel';

const draft = (kind: CyberBearInputDraft['kind'], value: string): CyberBearInputDraft => ({
  id: 'input',
  channel: 'ears',
  kind,
  value,
});

describe('CyberBear input values', () => {
  it('accepts decimal and hexadecimal bytes including both bounds', () => {
    for (const [text, byte] of [
      ['0', 0],
      ['255', 255],
      ['0xFF', 255],
      ['42', 42],
    ] as const) {
      expect(cyberBearInputError(draft('byte', text))).toBeUndefined();
      expect(cyberBearInputValue(draft('byte', text))).toEqual({ channel: 'ears', byte });
    }
    for (const text of ['', '-1', '256', '1.5', '1e2', 'text', '0x100']) {
      expect(cyberBearInputError(draft('byte', text))).toBeTruthy();
    }
  });

  it('preserves single Windows-1251 symbols and rejects unsupported or multiple symbols', () => {
    for (const symbol of ['М', 'Ё', 'ё', ' ', 'A', '€', '№']) {
      expect(cyberBearInputError(draft('symbol', symbol))).toBeUndefined();
      expect(cyberBearInputValue(draft('symbol', symbol))).toEqual({ channel: 'ears', symbol });
    }
    for (const symbol of ['', 'МЕД', '🐻', 'é']) {
      expect(cyberBearInputError(draft('symbol', symbol))).toBeTruthy();
    }
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
