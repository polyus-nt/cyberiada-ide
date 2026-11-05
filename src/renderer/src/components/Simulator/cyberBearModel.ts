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
  timeMs: string;
  value: string;
};

export const MAX_CYBERBEAR_INPUTS = 10_000;

export const cyberBearByteError = (value: string): string | undefined => {
  const text = value.trim();
  if (!/^(?:\d+|0x[0-9a-f]+)$/i.test(text) || Number(text) > 255)
    return 'Укажите байт от 0 до 255 (можно 0xFF).';
  return undefined;
};

export const cyberBearTimeError = (timeMs: string): string | undefined => {
  if (!/^\d+$/.test(timeMs.trim()) || !Number.isSafeInteger(Number(timeMs)))
    return 'Укажите целое неотрицательное время в миллисекундах.';
  return undefined;
};

export const cyberBearInputError = ({ value, timeMs }: CyberBearInputDraft): string | undefined =>
  cyberBearByteError(value) ?? cyberBearTimeError(timeMs);

export const cyberBearInputValue = (draft: CyberBearInputDraft): CyberBearInput => ({
  channel: draft.channel,
  byte: Number(draft.value.trim()),
  timeMs: Number(draft.timeMs),
});

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
