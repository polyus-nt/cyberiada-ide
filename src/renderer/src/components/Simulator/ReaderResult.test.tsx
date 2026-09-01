import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SimulationResult } from '@renderer/types/InterpreterTypes';

import { ReaderResult } from './ReaderResult';

const result: SimulationResult = {
  status: 'success',
  result: {
    signals: ['reader.char_accepted', 'reader.line_finished'],
    calledSignals: ['impulseA'],
  },
};

describe('ReaderResult', () => {
  it('shows output impulses without system events', () => {
    const html = renderToStaticMarkup(<ReaderResult result={result} stale={false} />);

    expect(html).toContain('impulseA');
    expect(html).not.toContain('reader.char_accepted');
    expect(html).not.toContain('reader.line_finished');
    expect(html).not.toContain('Системные события');
  });

  it('keeps a stale result visible with a warning', () => {
    const html = renderToStaticMarkup(<ReaderResult result={result} stale />);

    expect(html).toContain('Результат устарел');
    expect(html).toContain('impulseA');
  });

  it('shows an empty state before the first run', () => {
    const html = renderToStaticMarkup(<ReaderResult stale={false} />);

    expect(html).toContain('Импульсы появятся после запуска');
  });
});
