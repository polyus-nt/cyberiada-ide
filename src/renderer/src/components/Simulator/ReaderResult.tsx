import React from 'react';

import { SimulationResult } from '@renderer/types/InterpreterTypes';

const statusLabels: Record<SimulationResult['status'], string> = {
  success: 'Завершено',
  timeout: 'Таймаут',
  cancelled: 'Отменено',
  crash: 'Авария',
  error: 'Ошибка',
};

export const ReaderResult: React.FC<{
  result?: SimulationResult;
  stale: boolean;
}> = ({ result, stale }) => {
  if (!result) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-border-primary p-4 text-center text-xs leading-4 text-text-inactive">
        Импульсы появятся после запуска.
      </div>
    );
  }

  const impulses = result.result?.calledSignals ?? [];

  return (
    <div className="grid gap-3 rounded-lg border border-border-primary p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-border-primary px-3 py-1 text-xs font-medium">
          {statusLabels[result.status]}
        </span>
        <span className="rounded-full bg-bg-active px-2.5 py-1 text-xs text-text-inactive">
          {impulses.length}
        </span>
      </div>

      {result.message && <p className="text-xs leading-4">{result.message}</p>}
      {stale && (
        <p className="rounded-lg border border-warning p-3 text-xs leading-4 text-warning">
          Результат устарел: машина состояний была изменена после запуска. Его по-прежнему можно
          просматривать.
        </p>
      )}

      {impulses.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-lg bg-bg-secondary p-4 text-center text-xs leading-4 text-text-inactive">
          Нет выходных импульсов.
        </div>
      ) : (
        <ol className="grid max-h-[236px] gap-2 overflow-y-auto overflow-x-hidden rounded-lg bg-bg-secondary p-2 scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
          {impulses.map((impulse, index) => (
            <li
              key={`${index}:${impulse}`}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-lg border border-border-primary bg-bg-primary p-2"
            >
              <span className="rounded-lg bg-bg-active px-1.5 py-1 text-center text-xs text-primary">
                {index + 1}
              </span>
              <code className="break-all font-Fira-Mono text-sm text-text-primary">{impulse}</code>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
