import React from 'react';

import { ScrollArea } from '@renderer/components/UI/ScrollArea';
import { SimulationResult } from '@renderer/types/InterpreterTypes';

import { getReaderImpulseLabel } from './readerModel';

export const ReaderImpulseList: React.FC<{
  impulses: string[];
  emptyMessage?: string;
  compact?: boolean;
}> = ({ impulses, emptyMessage = 'Нет выходных импульсов.', compact = false }) =>
  impulses.length === 0 ? (
    <div
      className={`flex ${
        compact ? 'h-14 p-2' : 'h-28 p-4'
      } items-center justify-center rounded-lg text-center text-xs leading-4 text-text-inactive`}
    >
      {emptyMessage}
    </div>
  ) : (
    <ScrollArea
      className={compact ? 'h-auto max-h-[180px] py-0' : 'max-h-[236px] min-h-0 flex-1 py-0'}
      viewportClassName="mr-[6px]"
      horizontalScroll={false}
    >
      <ol className={compact ? 'flex flex-wrap gap-2' : 'grid gap-2'}>
        {impulses.map((impulse, index) => (
          <li
            key={`${index}:${impulse}`}
            className={`rounded-lg border border-border-primary bg-bg-primary ${
              compact ? 'px-2 py-1' : 'p-2'
            }`}
          >
            <code className="break-all text-text-primary">{getReaderImpulseLabel(impulse)}</code>
          </li>
        ))}
      </ol>
    </ScrollArea>
  );

export const ReaderResult: React.FC<{
  result?: SimulationResult;
  stale: boolean;
  active: boolean;
}> = ({ result, stale, active }) => {
  if (!result) {
    return (
      <div className="flex min-h-44 flex-1 items-center justify-center rounded-lg border border-border-primary p-4 text-center text-xs leading-4 text-text-inactive">
        {active ? 'Ожидание выходных импульсов…' : 'Импульсы появятся после запуска.'}
      </div>
    );
  }

  const impulses = result.result?.calledSignals ?? [];

  return (
    <div className="flex max-h-[calc(100vh-170px)] min-h-0 flex-1 flex-col gap-3 rounded-lg border border-border-primary p-3">
      {result.message && <p className="text-xs leading-4">{result.message}</p>}
      {stale && (
        <p className="rounded-lg border border-warning p-3 text-xs leading-4 text-warning">
          Результат устарел: машина состояний была изменена после запуска. Его по-прежнему можно
          просматривать.
        </p>
      )}

      <ReaderImpulseList impulses={impulses} />
    </div>
  );
};
