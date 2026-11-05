import React, { useState } from 'react';

import { ScrollArea } from '@renderer/components/UI/ScrollArea';

import type {
  CyberBearParameters,
  CyberBearState,
  SimulationResult,
} from '@renderer/types/InterpreterTypes';

import { CyberBearView } from './CyberBearView';
import { CyberBearInputs } from './CyberBearInputs';
import {
  CyberBearInputDraft,
  createCyberBearState,
  cyberBearInputError,
  cyberBearInputValue,
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
    <ScrollArea
      className="min-h-0 flex-1 text-sm"
      viewportClassName="pr-3"
      contentClassName="grid min-h-full grid-cols-[205px_minmax(260px,1fr)_260px] gap-6 max-[983px]:grid-cols-[205px_minmax(260px,1fr)] max-[729px]:grid-cols-1"
    >
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
      </section>
      <div className="max-[983px]:col-span-2 max-[729px]:col-span-1">
        <CyberBearInputs inputs={inputs} active={active} onChange={setInputs} />
      </div>
    </ScrollArea>
  );
};
