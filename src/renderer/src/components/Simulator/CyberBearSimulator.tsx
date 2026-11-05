import React, { useState } from 'react';

import type {
  CyberBearParameters,
  CyberBearState,
  RGBK,
  SimulationResult,
} from '@renderer/types/InterpreterTypes';

import { CyberBearView } from './CyberBearView';
import { CyberBearInputs } from './CyberBearInputs';
import {
  CyberBearInputDraft,
  createCyberBearState,
  cyberBearInputError,
  cyberBearInputValue,
  rgbkColor,
} from './cyberBearModel';
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
  const [inputs, setInputs] = useState<CyberBearInputDraft[]>([]);
  const state = cyberBear ?? createCyberBearState();

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[205px_minmax(260px,1fr)_260px] gap-6 overflow-auto text-sm max-[983px]:grid-cols-[205px_minmax(260px,1fr)] max-[729px]:grid-cols-1">
      <SimulationRunPanel
        machineSelector={machineSelector}
        mode={mode}
        timeout={timeout}
        ready={ready && inputs.every((input) => !cyberBearInputError(input))}
        active={active}
        error={error}
        message={result?.message}
        stale={stale}
        onModeChange={setMode}
        onTimeoutChange={setTimeoutValue}
        onStart={() => onStart(mode, timeout, { inputs: inputs.map(cyberBearInputValue) })}
        onCancel={onCancel}
      />
      <section className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="h2-header">КиберМишка</h2>
          <span className="text-xs text-text-inactive">
            {active ? 'Выполняется' : cyberBear ? 'Последнее состояние' : 'Готов к запуску'}
          </span>
        </div>
        <div className="rounded-lg border border-border-primary bg-bg-primary px-6 py-2">
          <CyberBearView state={state} />
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
          Матрица: 5 × 7, яркость от 0 до 100%.
        </p>
        <CyberBearInputs inputs={inputs} active={active} onChange={setInputs} />
      </div>
    </div>
  );
};
