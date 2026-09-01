export const countUnicodeCharacters = (value: string): number => Array.from(value).length;

export const limitUnicodeCharacters = (value: string, limit: number): string =>
  Array.from(value).slice(0, limit).join('');
