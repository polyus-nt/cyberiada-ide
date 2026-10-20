import type {
  CyberBearChannel,
  CyberBearInput,
  CyberBearState,
  RGBK,
} from '@renderer/types/InterpreterTypes';

export const createCyberBearState = (): CyberBearState => ({
  eyes: { right: [0, 0, 0, 0], left: [0, 0, 0, 0] },
  matrix: Array.from({ length: 7 }, () => Array<number>(5).fill(0)),
});

// The device palette uses LED timings rather than screen RGB intensities.
// Match its known colour proportions before applying the darkness duty cycle.
const eyePalette: { timing: [number, number, number]; color: [number, number, number] }[] = [
  { timing: [21, 1, 0], color: [255, 128, 0] },
  { timing: [6, 4, 0], color: [191, 255, 0] },
  { timing: [0, 12, 10], color: [0, 255, 255] },
  { timing: [10, 0, 2], color: [255, 105, 180] },
  { timing: [6, 0, 10], color: [160, 64, 255] },
  { timing: [10, 2, 0], color: [255, 255, 0] },
  { timing: [15, 4, 1], color: [255, 255, 255] },
];

export const rgbkColor = ([r, g, b, k]: RGBK): string => {
  const lit = r + g + b;
  if (lit === 0) return 'rgb(0, 0, 0)';
  const rgb = [r, g, b];
  const matched = eyePalette.find(({ timing }) => {
    const total = timing.reduce((sum, value) => sum + value, 0);
    return rgb.every((value, index) => value * total === timing[index] * lit);
  });
  const color = matched?.color ?? rgb.map((value) => (255 * value) / Math.max(r, g, b));
  const brightness = lit / (lit + k);
  return `rgb(${color.map((value) => Math.round(value * brightness)).join(', ')})`;
};

export type CyberBearInputDraft = {
  id: string;
  channel: CyberBearChannel;
  kind: 'symbol' | 'byte';
  value: string;
};

export const MAX_CYBERBEAR_INPUTS = 10_000;

export const cyberBearInputError = ({ kind, value }: CyberBearInputDraft): string | undefined => {
  if (kind === 'byte') {
    const text = value.trim();
    return /^(?:\d+|0x[0-9a-f]+)$/i.test(text) && Number(text) <= 255
      ? undefined
      : 'Укажите байт от 0 до 255 (можно 0xFF).';
  }
  if (Array.from(value).length !== 1) return 'Укажите один символ.';
  if (value.charCodeAt(0) <= 0x7f) return undefined;
  // Windows-1251 includes ASCII, Cyrillic and the following punctuation/symbols.
  const supported =
    /^[\u00a0\u00a4\u00a6-\u00a7\u00a9\u00ab-\u00ae\u00b0-\u00b1\u00b5-\u00b7\u00bb\u0401-\u040c\u040e-\u044f\u0451-\u045c\u045e-\u045f\u0490-\u0491\u2013-\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039-\u203a\u20ac\u2116\u2122]$/u;
  return supported.test(value) ? undefined : 'Символ отсутствует в Windows-1251.';
};

export const cyberBearInputValue = (draft: CyberBearInputDraft): CyberBearInput =>
  draft.kind === 'byte'
    ? { channel: draft.channel, byte: Number(draft.value.trim()) }
    : { channel: draft.channel, symbol: draft.value };

export const isCyberBearState = (value: unknown): value is CyberBearState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as CyberBearState;
  const validNumber = (number: unknown, max: number) =>
    typeof number === 'number' && Number.isInteger(number) && number >= 0 && number <= max;
  return (
    ['right', 'left'].every((side) => {
      const eye = state.eyes?.[side];
      return Array.isArray(eye) && eye.length === 4 && eye.every((v) => validNumber(v, 255));
    }) &&
    Array.isArray(state.matrix) &&
    state.matrix.length === 7 &&
    state.matrix.every(
      (row) => Array.isArray(row) && row.length === 5 && row.every((v) => validNumber(v, 100))
    )
  );
};
