import React, { useState } from 'react';

import type {
  CyberBearParameters,
  CyberBearState,
  RGBK,
  SimulationResult,
} from '@renderer/types/InterpreterTypes';

import { createCyberBearState, rgbkColor } from './cyberBearModel';
import { limitUnicodeCharacters } from './readerModel';
import { SimulationMode, SimulationRunPanel } from './SimulationRunPanel';

interface CyberBearSimulatorProps {
  machineSelector: React.ReactNode;
  ready: boolean;
  active: boolean;
  cyberBear?: CyberBearState;
  result?: SimulationResult;
  error?: string;
  stale: boolean;
  onStart: (mode: SimulationMode, timeout: number, parameters: CyberBearParameters) => void;
  onCancel: () => void;
}

const EyeValues: React.FC<{ label: string; value: RGBK }> = ({ label, value }) => (
  <section className="rounded-lg border border-border-primary p-3">
    <h3 className="mb-3 flex items-center gap-2 text-xs font-medium">
      <span
        className="size-4 rounded-full border border-border-primary"
        style={{ backgroundColor: rgbkColor(value) }}
        aria-hidden="true"
      />
      {label}
    </h3>
    <dl className="grid grid-cols-4 gap-2 text-center text-xs">
      {['R', 'G', 'B', 'K'].map((channel, index) => (
        <div key={channel}>
          <dt className="text-text-inactive">{channel}</dt>
          <dd className="mt-1 font-mono tabular-nums">{value[index]}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export const CyberBearSimulator: React.FC<CyberBearSimulatorProps> = ({
  machineSelector,
  ready,
  active,
  cyberBear,
  result,
  error,
  stale,
  onStart,
  onCancel,
}) => {
  const [mode, setMode] = useState<SimulationMode>('finite');
  const [timeout, setTimeoutValue] = useState(10);
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<'ir' | 'ears'>('ir');
  const state = cyberBear ?? createCyberBearState();

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[205px_minmax(260px,1fr)_205px] gap-6 overflow-auto text-sm max-[983px]:grid-cols-[205px_minmax(260px,1fr)] max-[729px]:grid-cols-1">
      <SimulationRunPanel
        machineSelector={machineSelector}
        mode={mode}
        timeout={timeout}
        ready={ready}
        active={active}
        error={error}
        message={result?.message}
        stale={stale}
        onModeChange={setMode}
        onTimeoutChange={setTimeoutValue}
        onStart={() => onStart(mode, timeout, { message, channel })}
        onCancel={onCancel}
      />
      <section className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="h2-header">КиберМишка</h2>
          <span className="text-xs text-text-inactive">
            {active ? 'Выполняется' : cyberBear ? 'Последнее состояние' : 'Готов к запуску'}
          </span>
        </div>
        <div className="rounded-lg bg-bg-secondary p-3">
          <svg
            viewBox="0 0 320 440"
            className="mx-auto max-h-[490px] w-full max-w-[360px]"
            role="img"
            aria-label="КиберМишка: глаза RGBK и матрица 5 на 7"
          >
            <path
              d="M97 44 C81 9 38 18 40 49 C41 68 52 78 71 78 C62 112 77 146 106 166 L98 180 Q79 182 65 157 L50 130 C38 107 10 112 10 134 Q10 148 21 164 L57 208 Q67 220 82 224 L82 311 L66 391 C61 421 93 434 111 410 L145 354 L175 354 L209 410 C227 434 259 421 254 391 L238 311 L238 224 Q253 220 263 208 L299 164 Q310 148 310 134 C310 112 282 107 270 130 L255 157 Q241 182 222 180 L214 166 C243 146 258 112 249 78 C268 78 279 68 280 49 C282 18 239 9 223 44 C194 9 126 9 97 44 Z"
              fill="var(--color-bg-primary, #f5f5f4)"
              stroke="#a8a29e"
              strokeWidth="2"
            />
            <g fill="#44403c">
              <circle cx="66" cy="49" r="12" />
              <circle cx="254" cy="49" r="12" />
              <path d="M149 109 Q160 100 171 109 L169 120 L151 120 Z" />
            </g>
            <path
              d="M160 119 V132 Q144 146 133 132 M160 132 Q176 146 187 132"
              fill="none"
              stroke="#44403c"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {(['right', 'left'] as const).map((side, index) => (
              <g key={side}>
                <title>
                  {`${side === 'right' ? 'Правый глаз' : 'Левый глаз'}: ${state.eyes[side].join(
                    ', '
                  )}`}
                </title>
                <circle
                  cx={index === 0 ? 119 : 201}
                  cy="88"
                  r="17"
                  fill={rgbkColor(state.eyes[side])}
                  opacity="0.16"
                />
                <circle
                  cx={index === 0 ? 119 : 201}
                  cy="88"
                  r="8"
                  fill={rgbkColor(state.eyes[side])}
                  stroke="#78716c"
                />
              </g>
            ))}
            {state.matrix.flatMap((row, y) =>
              row.map((brightness, x) => (
                <g key={`${x}:${y}`}>
                  <title>{`Строка ${y + 1}, столбец ${x + 1}: ${brightness}%`}</title>
                  <circle cx={120 + x * 20} cy={210 + y * 20} r="6" fill="#44403c" />
                  <circle
                    cx={120 + x * 20}
                    cy={210 + y * 20}
                    r="6"
                    fill="#fef08a"
                    opacity={brightness / 100}
                  />
                </g>
              ))
            )}
          </svg>
        </div>
        <p className="mt-3 text-xs leading-4 text-text-inactive">
          Глаза и матрица обновляются во время выполнения программы.
        </p>
      </section>
      <div className="space-y-3 max-[983px]:col-span-2 max-[729px]:col-span-1">
        <h2 className="h2-header">Глаза RGBK</h2>
        <EyeValues label="Правый глаз" value={state.eyes.right} />
        <EyeValues label="Левый глаз" value={state.eyes.left} />
        <p className="text-xs leading-4 text-text-inactive">
          R, G, B — длительности свечения. K — длительность выключения, уменьшающая яркость. Правый
          и левый глаз указаны со стороны Мишки.
        </p>
        <p className="text-xs leading-4 text-text-inactive">
          Матрица: 5 × 7, яркость от 0 до 100%.
        </p>
        <section className="border-t border-border-primary pt-3">
          <h2 className="h2-header mb-3">Входное сообщение</h2>
          <label className="grid gap-2 text-xs" htmlFor="cyberbear-channel">
            Канал
            <select
              id="cyberbear-channel"
              className="h-8 rounded-lg border border-border-primary bg-bg-primary px-2 disabled:text-text-inactive"
              value={channel}
              disabled={active}
              onChange={(event) => setChannel(event.target.value as 'ir' | 'ears')}
            >
              <option value="ir">ИК-нос</option>
              <option value="ears">Уши</option>
            </select>
          </label>
          <label className="mt-3 grid gap-2 text-xs" htmlFor="cyberbear-message">
            Строка
            <textarea
              id="cyberbear-message"
              className="h-24 w-full resize-y rounded-lg border border-border-primary bg-bg-primary p-2 disabled:text-text-inactive"
              value={message}
              disabled={active}
              placeholder="Например, МЕДОСАСОН"
              onChange={(event) => setMessage(limitUnicodeCharacters(event.target.value, 10_000))}
            />
          </label>
          <p className="mt-2 text-xs leading-4 text-text-inactive">
            Строка передаётся побайтно в Windows-1251. До 10 000 символов.
          </p>
        </section>
      </div>
    </div>
  );
};
