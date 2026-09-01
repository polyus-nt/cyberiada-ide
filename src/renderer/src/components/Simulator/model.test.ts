import { describe, expect, it } from 'vitest';

import { clampPosition, createField, nextPlaybackIndex, resizeField, setFieldCell } from './model';

describe('simulator field model', () => {
  it('creates independent empty rows', () => {
    const field = createField(2, 2);

    field[0][0] = 1;

    expect(field).toEqual([
      [1, 0],
      [0, 0],
    ]);
  });

  it('preserves existing cells while resizing', () => {
    const field = setFieldCell(createField(2, 2), 1, 1, -1);

    expect(resizeField(field, 3, 2)).toEqual([
      [0, 0, 0],
      [0, -1, 0],
    ]);
    expect(resizeField(field, 1, 1)).toEqual([[0]]);
  });

  it('updates a cell without mutating the source field', () => {
    const field = createField(2, 1);

    const updated = setFieldCell(field, 1, 0, 3);

    expect(field).toEqual([[0, 0]]);
    expect(updated).toEqual([[0, 3]]);
  });

  it('keeps the gardener inside a resized field', () => {
    expect(clampPosition({ x: 10, y: -2 }, 4, 3)).toEqual({ x: 3, y: 0 });
  });

  it('advances playback without leaving the available history', () => {
    expect(nextPlaybackIndex(0, 3)).toBe(1);
    expect(nextPlaybackIndex(2, 3)).toBe(2);
    expect(nextPlaybackIndex(0, 0)).toBe(0);
  });
});
