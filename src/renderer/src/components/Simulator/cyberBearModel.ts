import type { CyberBearState, RGBK } from '@renderer/types/InterpreterTypes';

export const createCyberBearState = (): CyberBearState => ({
  eyes: { right: [0, 0, 0, 0], left: [0, 0, 0, 0] },
  matrix: Array.from({ length: 7 }, () => Array<number>(5).fill(0)),
});

// RGBK stores time slices, including darkness, rather than RGB channel intensities.
export const rgbkColor = ([r, g, b, k]: RGBK): string => {
  const total = r + g + b + k;
  if (total === 0) return 'rgb(0, 0, 0)';
  return `rgb(${[r, g, b].map((channel) => Math.round((255 * channel) / total)).join(', ')})`;
};

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
