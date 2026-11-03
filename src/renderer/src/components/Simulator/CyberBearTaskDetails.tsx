import React, { useEffect, useMemo, useState } from 'react';

import { createCyberBearState } from './cyberBearModel';
import { CyberBearView } from './CyberBearView';

import type { CyberBearTaskInput, VerificationTest } from '../../../../common/tasks';
import type { CyberBearState, SimulationResult } from '../../types/InterpreterTypes';

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
    <div className="grid min-h-0 gap-4 overflow-auto p-4 lg:grid-cols-2">
      <section className="rounded-lg bg-bg-secondary p-3">
        <CyberBearView state={state} />
      </section>
      <section className="flex flex-col gap-4 text-xs">
        <h3 className="h2-header">История КиберМишки</h3>
        <p>
          Время: {frame?.timeMs ?? 0} мс · Наблюдение: {input.durationMs} мс
        </p>
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
        />
        <button
          type="button"
          className="rounded-lg border border-border-primary px-3 py-2"
          disabled={frames.length < 2}
          onClick={() => {
            if (index >= frames.length - 1) setIndex(0);
            setPlaying((value) => !value);
          }}
        >
          {playing ? 'Пауза' : 'Воспроизвести'}
        </button>
        <p>Правый глаз RGBK: {state.eyes.right.join(', ')}</p>
        <p>Левый глаз RGBK: {state.eyes.left.join(', ')}</p>
        {test.hideInputs ? (
          <p>Входные байты скрыты. Расшифруйте сообщение по глазам и рисункам.</p>
        ) : (
          <div>
            <h3 className="h2-header mb-2">Входные байты</h3>
            <ol className="max-h-60 space-y-1 overflow-auto">
              {input.inputs.map((item, i) => (
                <li key={i}>
                  {item.timeMs} мс · {item.channel === 'ir' ? 'ИК' : 'Уши'} · {item.byte}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
};
