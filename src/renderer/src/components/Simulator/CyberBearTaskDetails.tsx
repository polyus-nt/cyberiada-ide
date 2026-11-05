import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { createCyberBearState } from './cyberBearModel';
import { CyberBearView } from './CyberBearView';

import type { CyberBearTaskInput, VerificationTest } from '../../../../common/tasks';
import type { CyberBearState, SimulationResult } from '../../types/InterpreterTypes';

const TaskInputSequence: React.FC<{ inputs: CyberBearTaskInput['inputs'] }> = ({ inputs }) => {
  const viewport = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(6);
  const [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => setPageSize(Math.max(1, Math.floor((element.clientHeight - 24) / 28)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const pages = Math.max(1, Math.ceil(inputs.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * pageSize;
  const pageButton =
    'h-7 rounded border border-border-primary px-2 text-xs enabled:hover:bg-bg-hover disabled:opacity-40';

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border-primary p-3">
      <h3 className="h2-header mb-2 shrink-0">Входная последовательность</h3>
      <div ref={viewport} className="min-h-0 flex-1 overflow-hidden">
        {inputs.length ? (
          <table className="w-full table-fixed text-left text-xs">
            <thead>
              <tr className="h-6 text-text-inactive">
                <th className="w-1/2 font-normal">Время, мс</th>
                <th className="font-normal">Канал</th>
                <th className="text-right font-normal">Байт</th>
              </tr>
            </thead>
            <tbody>
              {inputs.slice(start, start + pageSize).map((item, index) => (
                <tr key={start + index} className="h-7 border-t border-border-primary tabular-nums">
                  <td>{item.timeMs}</td>
                  <td title={item.channel === 'ir' ? 'ИК' : 'Акустика'}>
                    {item.channel === 'ir' ? 'ИК' : 'АК'}
                  </td>
                  <td className="text-right">{item.byte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-text-inactive">Нет входных байтов.</p>
        )}
      </div>
      {pages > 1 && (
        <nav
          aria-label="Страницы входной последовательности"
          className="mt-2 flex h-7 shrink-0 items-center justify-between gap-2"
        >
          <button
            type="button"
            className={pageButton}
            disabled={currentPage === 0}
            aria-label="Предыдущие входные байты"
            onClick={() => setPage(currentPage - 1)}
          >
            ←
          </button>
          <span className="text-xs tabular-nums">
            {currentPage + 1} / {pages}
          </span>
          <button
            type="button"
            className={pageButton}
            disabled={currentPage >= pages - 1}
            aria-label="Следующие входные байты"
            onClick={() => setPage(currentPage + 1)}
          >
            →
          </button>
        </nav>
      )}
    </section>
  );
};

export const CyberBearTaskDetails: React.FC<{
  test: VerificationTest;
  execution?: SimulationResult;
}> = ({ test, execution }) => {
  const input = test.input as CyberBearTaskInput;
  const frames = useMemo(() => {
    const timeline = new Map<number, CyberBearState>();
    let current: CyberBearState | undefined;
    for (const event of execution?.result?.trace ?? []) {
      if (event.kind === 'state' && event.state) {
        current = event.state;
        timeline.set(event.timeMs, current);
      } else if (event.kind === 'input' && current) {
        timeline.set(event.timeMs, current);
      }
    }
    return [...timeline].map(([timeMs, state]) => ({ timeMs, state }));
  }, [execution]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setIndex(Math.max(0, frames.length - 1));
    setPlaying(false);
  }, [test.id, frames.length]);
  useEffect(() => {
    if (!playing || index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((value) => value + 1), 500);
    return () => window.clearTimeout(timer);
  }, [playing, index, frames.length]);
  const frame = frames[index];
  const state = frame?.state ?? execution?.result?.cyberBear ?? createCyberBearState();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(180px,1fr)] gap-3">
        <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border-primary p-3">
          <h3 className="h2-header mb-2 shrink-0">КиберМишка</h3>
          <div className="min-h-0 flex-1">
            <CyberBearView state={state} className="h-full max-h-full" />
          </div>
        </section>
        {test.hideInputs ? (
          <section className="flex min-h-0 min-w-0 flex-col justify-center rounded-lg border border-border-primary p-3">
            <h3 className="h2-header mb-2">Входные байты скрыты</h3>
            <p className="text-xs leading-5 text-text-inactive">
              Расшифруйте сообщение по глазам и рисункам.
            </p>
          </section>
        ) : (
          <TaskInputSequence key={test.id} inputs={input.inputs} />
        )}
      </div>
      <section
        aria-label="История КиберМишки"
        className="shrink-0 rounded-lg border border-border-primary p-3 text-xs"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="h2-header">История</h3>
          <span className="tabular-nums">
            Время: {frame?.timeMs ?? 0} мс · Наблюдение: {input.durationMs} мс
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="h-8 shrink-0 rounded-lg border border-border-primary px-3 disabled:opacity-40"
            disabled={frames.length < 2}
            onClick={() => {
              if (index >= frames.length - 1) setIndex(0);
              setPlaying((value) => !value);
            }}
          >
            {playing ? 'Пауза' : 'Воспроизвести'}
          </button>
          <input
            type="range"
            aria-label="Шаг истории КиберМишки"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={index}
            disabled={!frames.length}
            onChange={(event) => {
              setPlaying(false);
              setIndex(Number(event.target.value));
            }}
            className="min-w-0 flex-1 accent-primary"
          />
          <span className="shrink-0 tabular-nums">
            {frames.length ? index + 1 : 0} / {frames.length}
          </span>
        </div>
      </section>
    </div>
  );
};
