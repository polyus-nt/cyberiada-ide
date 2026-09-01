export const MIN_FIELD_SIZE = 1;
export const MAX_FIELD_SIZE = 30;

export type GardenerCell = -1 | 0 | 1 | 2 | 3;
export type GardenerOrientation = 'north' | 'east' | 'south' | 'west';

export interface GardenerPosition {
  x: number;
  y: number;
}

export const createField = (width: number, height: number): GardenerCell[][] =>
  Array.from({ length: height }, () => Array<GardenerCell>(width).fill(0));

export const resizeField = (
  field: GardenerCell[][],
  width: number,
  height: number
): GardenerCell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => field[y]?.[x] ?? 0)
  );

export const setFieldCell = (
  field: GardenerCell[][],
  x: number,
  y: number,
  value: GardenerCell
): GardenerCell[][] =>
  field.map((row, rowIndex) =>
    rowIndex === y ? row.map((cell, columnIndex) => (columnIndex === x ? value : cell)) : row
  );

export const clampPosition = (
  position: GardenerPosition,
  width: number,
  height: number
): GardenerPosition => ({
  x: Math.max(0, Math.min(width - 1, position.x)),
  y: Math.max(0, Math.min(height - 1, position.y)),
});

export const nextPlaybackIndex = (currentIndex: number, stepCount: number): number =>
  stepCount === 0 ? 0 : Math.min(currentIndex + 1, stepCount - 1);
