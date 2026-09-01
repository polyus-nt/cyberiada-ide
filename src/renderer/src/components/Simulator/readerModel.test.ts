import { describe, expect, it } from 'vitest';

import { countUnicodeCharacters, limitUnicodeCharacters } from './readerModel';

describe('Reader input model', () => {
  it('counts Unicode code points instead of UTF-16 code units', () => {
    expect(countUnicodeCharacters('Я🙂')).toBe(2);
  });

  it('limits input without splitting a surrogate pair', () => {
    expect(limitUnicodeCharacters('a🙂b', 2)).toBe('a🙂');
  });
});
