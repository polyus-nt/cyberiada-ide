import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { ParameterSelect } from '@renderer/components/UI';
import { getMissingComponentReferences } from '@renderer/lib/data/ComponentReferences';
import { exportCGML, exportStateMachineCGML } from '@renderer/lib/data/GraphmlBuilder';
import { getPlatform } from '@renderer/lib/data/PlatformLoader';
import { useModelContext } from '@renderer/store/ModelContext';
import { getActiveTask, useTasks } from '@renderer/store/useTasks';
import { StateMachine } from '@renderer/types/diagram';
import {
  GardenerParameters,
  ReaderParameters,
  CyberBearParameters,
  SimulationResult,
} from '@renderer/types/InterpreterTypes';

import { CyberBearSimulator } from './CyberBearSimulator';
import { ExecutionHistory } from './ExecutionHistory';
import { GardenerMarker, gardenerCellStyles } from './GardenerField';
import {
  GardenerCell,
  GardenerOrientation,
  MAX_FIELD_SIZE,
  MIN_FIELD_SIZE,
  clampPosition,
  createField,
  nextPlaybackIndex,
  resizeField,
  setFieldCell,
} from './model';
import { countUnicodeCharacters, limitUnicodeCharacters } from './readerModel';
import { ReaderResult } from './ReaderResult';
import {
  SimulationMachineOption,
  getSimulationMachineOptions,
  isSimulationResultStale,
  selectInitialMachineId,
} from './selection';
import { SimulationMode, SimulationRunPanel } from './SimulationRunPanel';
import { TaskMode } from './TaskMode';
import { taskForProtocol } from './taskProtocol';
import { useInterpreter } from './useInterpreter';

interface SimulatorProps {
  initialSmId?: string;
  onStatusChange?: (status: string) => void;
  onAutoSizeChange?: (autoSize: boolean) => void;
}

type GardenerTool = GardenerCell | 'position';
type SimulationParameters = GardenerParameters | ReaderParameters | CyberBearParameters;

interface RuntimeProps {
  ready: boolean;
  active: boolean;
  result?: SimulationResult;
  error?: string;
  stale: boolean;
  onStart: (mode: SimulationMode, timeout: number, parameters: SimulationParameters) => void;
  onCancel: () => void;
}

interface GardenerRuntimeProps extends RuntimeProps {
  machineSelector: React.ReactNode;
  hideRunPanel?: boolean;
  onParametersChange?: (parameters: GardenerParameters) => void;
}

type ReaderRuntimeProps = GardenerRuntimeProps;

const fieldTools: { value: GardenerTool; label: string; swatch: string }[] = [
  { value: 'position', label: 'Старт', swatch: 'bg-[#ffd600]' },
  { value: 0, label: 'Пусто', swatch: 'border border-border-primary bg-white' },
  { value: -1, label: 'Стена', swatch: 'bg-[#333333]' },
  { value: 1, label: 'Роза', swatch: 'bg-[#e87373]' },
  { value: 2, label: 'Мята', swatch: 'bg-[#78ed9d]' },
  { value: 3, label: 'Василёк', swatch: 'bg-[#65ced8]' },
];

const cellLabels: Record<GardenerCell, string> = {
  [-1]: 'стена',
  0: 'пустая клетка',
  1: 'роза',
  2: 'мята',
  3: 'василёк',
};

const orientationOptions: { value: GardenerOrientation; label: string }[] = [
  { value: 'north', label: 'Север' },
  { value: 'east', label: 'Восток' },
  { value: 'south', label: 'Юг' },
  { value: 'west', label: 'Запад' },
];

const controlClassName =
  'h-8 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-xs text-text-primary outline-none focus:border-text-inactive';

const gardenerNumericControlClassName =
  'h-8 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-xs text-text-primary outline-none focus:border-text-inactive';

const PLAYBACK_INTERVAL_MS = 500;

const FieldInput: React.FC<React.PropsWithChildren<{ label: string; htmlFor: string }>> = ({
  label,
  htmlFor,
  children,
}) => (
  <label className="grid gap-2 text-xs" htmlFor={htmlFor}>
    <span className="text-text-primary">{label}</span>
    {children}
  </label>
);

const MachineSelector: React.FC<{
  options: SimulationMachineOption[];
  selectedSmId?: string;
  active: boolean;
  onSelect: (smId: string) => void;
}> = ({ options, selectedSmId, active, onSelect }) => (
  <div className="min-w-0">
    <label className="grid gap-2 text-xs" htmlFor="simulator-state-machine">
      <span className="h2-header font-medium">Машина состояний</span>
      <ParameterSelect
        inputId="simulator-state-machine"
        className="w-full"
        isSearchable={false}
        isClearable={false}
        isDisabled={active || options.length === 0}
        placeholder={options.length === 0 ? 'Нет поддерживаемых машин' : 'Выберите машину'}
        noOptionsMessage={() => 'Нет поддерживаемых машин'}
        options={options.map(({ id, machine: optionMachine }) => ({
          value: id,
          label: optionMachine.name || id,
        }))}
        value={options
          .map(({ id, machine: optionMachine }) => ({ value: id, label: optionMachine.name || id }))
          .find((option) => option.value === selectedSmId)}
        onChange={(option) => {
          if (option) onSelect(option.value);
        }}
      />
    </label>
  </div>
);

const GardenerSimulator: React.FC<GardenerRuntimeProps> = ({
  machineSelector,
  hideRunPanel,
  onParametersChange,
  ready,
  active,
  result,
  error,
  stale,
  onStart,
  onCancel,
}) => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(8);
  const [field, setField] = useState(() => createField(width, height));
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [orientation, setOrientation] = useState<GardenerOrientation>('east');
  useEffect(() => {
    onParametersChange?.({
      width,
      height,
      field,
      position,
      orientation: orientation.toUpperCase() as Uppercase<GardenerOrientation>,
    });
  }, [width, height, field, position, orientation, onParametersChange]);
  const [selectedTool, setSelectedTool] = useState<GardenerTool>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const [mode, setMode] = useState<SimulationMode>('finite');
  const [timeout, setTimeoutValue] = useState(10);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [reviewingHistory, setReviewingHistory] = useState(false);
  const [showCurrentState, setShowCurrentState] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const resultSteps = result?.steps;
  const steps = resultSteps ?? [];
  const historyStep = reviewingHistory ? steps[historyIndex] : undefined;
  const displayedStep = active || showCurrentState ? result?.result?.environment : historyStep;
  const displayedField = displayedStep?.field ?? field;
  const displayedPosition = displayedStep?.position ?? position;
  const displayedOrientation = displayedStep?.orientation ?? orientation;

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
      setIsRightMouseDown(false);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (reviewingHistory) return;

      if (event.button === 0) {
        setIsMouseDown(true);
      } else if (event.button === 2) {
        setIsRightMouseDown(true);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [reviewingHistory]);

  useLayoutEffect(() => {
    setHistoryIndex(Math.max(0, steps.length - 1));
    setReviewingHistory(false);
    setShowCurrentState(true);
    setIsPlaying(false);
  }, [resultSteps, steps.length]);

  useEffect(() => {
    if (!isPlaying) return;
    if (historyIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setHistoryIndex((current) => nextPlaybackIndex(current, steps.length));
    }, PLAYBACK_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [historyIndex, isPlaying, steps.length]);

  const selectHistoryStep = (index: number) => {
    setIsPlaying(false);
    setShowCurrentState(false);
    setReviewingHistory(true);
    setHistoryIndex(index);
  };

  const togglePlayback = () => {
    if (steps.length === 0) return;
    setReviewingHistory(true);
    setShowCurrentState(false);
    if (!isPlaying && historyIndex === steps.length - 1) setHistoryIndex(0);
    setIsPlaying((current) => !current);
  };

  const stopHistoryPlayback = () => {
    setIsPlaying(false);
    setReviewingHistory(false);
    setShowCurrentState(false);
  };

  const updateWidth = (value: number) => {
    const nextWidth = Math.max(MIN_FIELD_SIZE, Math.min(MAX_FIELD_SIZE, value));
    stopHistoryPlayback();
    setWidth(nextWidth);
    setField((current) => resizeField(current, nextWidth, height));
    setPosition((current) => clampPosition(current, nextWidth, height));
  };

  const updateHeight = (value: number) => {
    const nextHeight = Math.max(MIN_FIELD_SIZE, Math.min(MAX_FIELD_SIZE, value));
    stopHistoryPlayback();
    setHeight(nextHeight);
    setField((current) => resizeField(current, width, nextHeight));
    setPosition((current) => clampPosition(current, width, nextHeight));
  };

  const applySelectedTool = (x: number, y: number) => {
    if (selectedTool === 'position') {
      if (field[y][x] !== -1) {
        stopHistoryPlayback();
        setPosition({ x, y });
      }
      return;
    }
    if (position.x === x && position.y === y && selectedTool === -1) return;
    stopHistoryPlayback();
    setField((current) => setFieldCell(current, x, y, selectedTool));
  };

  const eraseCell = (x: number, y: number) => {
    stopHistoryPlayback();
    setField((current) => setFieldCell(current, x, y, 0));
  };

  const handleCellMouseDown = (event: React.MouseEvent, x: number, y: number) => {
    event.preventDefault();
    if (active) return;

    if (event.button === 0) {
      applySelectedTool(x, y);
    } else if (event.button === 2) {
      eraseCell(x, y);
    }
  };

  const handleCellMouseEnter = (event: React.MouseEvent, x: number, y: number) => {
    event.preventDefault();
    if (active) return;

    if (isRightMouseDown) {
      eraseCell(x, y);
    } else if (isMouseDown) {
      applySelectedTool(x, y);
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[205px_minmax(398px,1fr)_228px] gap-x-6 gap-y-5 overflow-auto text-sm max-[983px]:grid-cols-[205px_minmax(398px,1fr)] max-[729px]:grid-cols-1">
      <div className="min-w-0">
        {!hideRunPanel && (
          <SimulationRunPanel
            machineSelector={machineSelector}
            mode={mode}
            timeout={timeout}
            ready={ready}
            active={active}
            error={error}
            message={result?.message}
            stale={stale}
            reserveFeedbackSpace
            onModeChange={(nextMode) => {
              stopHistoryPlayback();
              setMode(nextMode);
            }}
            onTimeoutChange={(nextTimeout) => {
              stopHistoryPlayback();
              setTimeoutValue(nextTimeout);
            }}
            onStart={() =>
              onStart(mode, timeout, {
                width,
                height,
                field,
                position,
                orientation: orientation.toUpperCase() as Uppercase<GardenerOrientation>,
              })
            }
            onCancel={onCancel}
          />
        )}

        <fieldset disabled={active}>
          <ExecutionHistory
            steps={steps}
            historyIndex={historyIndex}
            isPlaying={isPlaying}
            isTruncated={result?.warnings?.includes('EXECUTION_HISTORY_TRUNCATED') ?? false}
            onSelectStep={selectHistoryStep}
            onTogglePlayback={togglePlayback}
          />
        </fieldset>
        {result?.result?.environment && (
          <button
            type="button"
            className="mt-3 h-8 w-full rounded-lg border border-border-primary px-3 text-xs"
            onClick={() => {
              setIsPlaying(false);
              setReviewingHistory(false);
              setShowCurrentState(true);
            }}
          >
            Текущее состояние
          </button>
        )}
      </div>

      <section className="min-w-0">
        <h2 className="h2-header mb-2">Поле</h2>
        <div className="overflow-auto rounded-lg bg-bg-secondary p-3">
          <div
            className="grid w-max gap-1.5"
            style={{ gridTemplateColumns: `repeat(${width}, 2rem)` }}
          >
            {displayedField.flatMap((row, y) =>
              row.map((cell, x) => {
                const hasGardener = displayedPosition.x === x && displayedPosition.y === y;
                return (
                  <button
                    key={`${x}:${y}`}
                    type="button"
                    title={`${x}, ${y}: ${cellLabels[cell]}`}
                    aria-label={`Клетка ${x}, ${y}: ${cellLabels[cell]}`}
                    className={twMerge(
                      'relative size-8 rounded-lg',
                      gardenerCellStyles[cell],
                      reviewingHistory && 'cursor-default'
                    )}
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                    onMouseDown={(event) => handleCellMouseDown(event, x, y)}
                    onMouseEnter={(event) => handleCellMouseEnter(event, x, y)}
                  >
                    {hasGardener && (
                      <GardenerMarker
                        aria-label="Стартовая позиция Садовника"
                        orientation={displayedOrientation}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        <p className="mt-6 max-w-[398px] text-xs leading-4 text-text-inactive">
          {active
            ? 'Выполняется. Поле обновляется в реальном времени.'
            : reviewingHistory
            ? `Просмотр шага ${historyIndex + 1} из ${steps.length}.`
            : 'Выберите инструмент и нажмите на клетку. Кнопка “Старт” переносит начальную позицию.'}
        </p>
      </section>

      <fieldset disabled={active} className="min-w-0 max-[983px]:col-span-2 max-[729px]:col-span-1">
        <section>
          <h2 className="h2-header mb-2">Настройки поля</h2>
          <div className="rounded-lg border border-border-primary p-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="Ширина" htmlFor="simulator-field-width">
                <input
                  id="simulator-field-width"
                  className={gardenerNumericControlClassName}
                  type="number"
                  min={MIN_FIELD_SIZE}
                  max={MAX_FIELD_SIZE}
                  value={width}
                  onChange={(event) => updateWidth(Number(event.target.value))}
                />
              </FieldInput>
              <FieldInput label="Высота" htmlFor="simulator-field-height">
                <input
                  id="simulator-field-height"
                  className={gardenerNumericControlClassName}
                  type="number"
                  min={MIN_FIELD_SIZE}
                  max={MAX_FIELD_SIZE}
                  value={height}
                  onChange={(event) => updateHeight(Number(event.target.value))}
                />
              </FieldInput>
              <FieldInput label="Старт X" htmlFor="simulator-position-x">
                <input
                  id="simulator-position-x"
                  className={gardenerNumericControlClassName}
                  type="number"
                  min={0}
                  max={width - 1}
                  value={position.x}
                  onChange={(event) => {
                    stopHistoryPlayback();
                    setPosition((current) =>
                      clampPosition({ ...current, x: Number(event.target.value) }, width, height)
                    );
                  }}
                />
              </FieldInput>
              <FieldInput label="Старт Y" htmlFor="simulator-position-y">
                <input
                  id="simulator-position-y"
                  className={gardenerNumericControlClassName}
                  type="number"
                  min={0}
                  max={height - 1}
                  value={position.y}
                  onChange={(event) => {
                    stopHistoryPlayback();
                    setPosition((current) =>
                      clampPosition({ ...current, y: Number(event.target.value) }, width, height)
                    );
                  }}
                />
              </FieldInput>
            </div>
            <div className="mt-3">
              <FieldInput label="Направление" htmlFor="simulator-orientation">
                <ParameterSelect
                  inputId="simulator-orientation"
                  className="w-full"
                  isSearchable={false}
                  isClearable={false}
                  options={orientationOptions}
                  value={orientationOptions.find((option) => option.value === orientation)}
                  onChange={(option) => {
                    if (!option) return;
                    stopHistoryPlayback();
                    setOrientation(option.value);
                  }}
                />
              </FieldInput>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="h2-header mb-2">Инструменты</h2>
          <div className="rounded-lg border border-border-primary p-3">
            <div className="grid grid-cols-2 gap-2">
              {fieldTools.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  className={twMerge(
                    'flex h-8 items-center gap-2 rounded-lg border border-border-primary px-3 text-left text-xs transition-colors hover:bg-bg-hover',
                    selectedTool === tool.value && 'bg-bg-active'
                  )}
                  onClick={() => {
                    stopHistoryPlayback();
                    setSelectedTool(tool.value);
                  }}
                >
                  {tool.value === 'position' ? (
                    <span className="text-base leading-none text-[#ffd600]">▼</span>
                  ) : (
                    <span className={twMerge('size-4 shrink-0 rounded-full', tool.swatch)} />
                  )}
                  {tool.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 h-8 w-full rounded-lg border border-border-primary px-3 text-xs transition-colors hover:bg-bg-hover"
              onClick={() => {
                stopHistoryPlayback();
                setField(createField(width, height));
              }}
            >
              Очистить поле
            </button>
          </div>
        </section>
      </fieldset>
    </div>
  );
};

const ReaderSimulator: React.FC<ReaderRuntimeProps> = ({
  machineSelector,
  ready,
  active,
  result,
  error,
  stale,
  onStart,
  onCancel,
}) => {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<SimulationMode>('finite');
  const [timeout, setTimeoutValue] = useState(10);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[205px_250px_170px] justify-start gap-x-6 gap-y-5 overflow-hidden text-sm max-[983px]:content-start max-[983px]:overflow-auto max-[729px]:grid-cols-1">
      <SimulationRunPanel
        machineSelector={machineSelector}
        mode={mode}
        timeout={timeout}
        ready={ready}
        active={active}
        error={error}
        onModeChange={setMode}
        onTimeoutChange={setTimeoutValue}
        onStart={() => onStart(mode, timeout, { message })}
        onCancel={onCancel}
      />

      <section className="flex min-h-0 min-w-0 flex-col">
        <h2 className="h2-header mb-2">Импульсы</h2>
        <ReaderResult result={result} stale={stale} active={active} />
      </section>

      <section className="min-w-0 max-[983px]:col-span-2 max-[729px]:col-span-1">
        <h2 className="h2-header mb-2">Входная строка</h2>
        <div className="rounded-lg border border-border-primary p-3">
          <textarea
            aria-label="Входная строка"
            className={twMerge(
              controlClassName,
              'h-32 min-h-32 max-w-none resize-y py-2 font-Inter leading-4'
            )}
            value={message}
            placeholder="Введите строку"
            onChange={(event) => setMessage(limitUnicodeCharacters(event.target.value, 10_000))}
          />
          <div className="mt-2 flex justify-end text-xs text-text-inactive">
            <span>{countUnicodeCharacters(message)} / 10 000</span>
          </div>
        </div>
      </section>
    </div>
  );
};

const useJointMachineRevision = (model: ReturnType<typeof useModelContext>, id: string) => {
  model.model.useData(id, 'elements.states');
  model.model.useData(id, 'elements.transitions');
  model.model.useData(id, 'elements.components');
  model.model.useData(id, 'elements.initialStates');
  model.model.useData(id, 'elements.finalStates');
  model.model.useData(id, 'elements.choiceStates');
  model.model.useData(id, 'elements.shallowHistory');
  model.model.useData(id, 'elements.name');
};

type JointSimulatorProps = {
  options: SimulationMachineOption[];
  interpreter: ReturnType<typeof useInterpreter>;
  onStart: (
    readerId: string,
    gardenerId: string,
    message: string,
    parameters: GardenerParameters,
    mode: SimulationMode,
    timeout: number
  ) => void;
};

export const JointSimulator: React.FC<JointSimulatorProps> = ({
  options,
  interpreter,
  onStart,
}) => {
  const readers = options.filter(({ machine }) => machine.platform === 'junior-reader');
  const gardeners = options.filter(({ machine }) => machine.platform === 'junior-gardener');
  const [selectedReaderId, setReaderId] = useState(readers[0]?.id ?? '');
  const [selectedGardenerId, setGardenerId] = useState(gardeners[0]?.id ?? '');
  const readerId = readers.some(({ id }) => id === selectedReaderId)
    ? selectedReaderId
    : readers[0]?.id ?? '';
  const gardenerId = gardeners.some(({ id }) => id === selectedGardenerId)
    ? selectedGardenerId
    : gardeners[0]?.id ?? '';
  const [tab, setTab] = useState('reader');
  const [message, setMessage] = useState('');
  const [parameters, setParameters] = useState<GardenerParameters>();
  const [mode, setMode] = useState<SimulationMode>('finite');
  const [timeout, setTimeoutValue] = useState(10);
  const model = useModelContext();
  useJointMachineRevision(model, readerId);
  useJointMachineRevision(model, gardenerId);
  const [runRevision, setRunRevision] = useState<string>();
  const currentRevision = JSON.stringify([
    model.model.data.elements.stateMachines[readerId],
    model.model.data.elements.stateMachines[gardenerId],
    message,
    parameters,
  ]);
  const stale = Boolean(interpreter.result && runRevision !== currentRevision);
  const referenceError = [readerId, gardenerId].flatMap((id) => {
    const machine = options.find((option) => option.id === id)?.machine;
    const platform = machine && getPlatform(machine.platform);
    return machine && platform ? getMissingComponentReferences(machine, platform) : [];
  });
  const valid =
    readers.some(({ id }) => id === readerId) && gardeners.some(({ id }) => id === gardenerId);
  const error = !valid
    ? 'Добавьте в документ Строчника и Садовника.'
    : referenceError.length
    ? `В схемах отсутствуют компоненты: ${referenceError.join(', ')}`
    : interpreter.ready && !interpreter.supportsSession
    ? 'Обновите интерпретатор для совместного запуска.'
    : interpreter.error;
  const readerResult = interpreter.result?.machines?.[readerId];
  const gardenerResult = interpreter.result?.machines?.[gardenerId];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <div className="flex flex-wrap gap-4">
        {[
          { label: 'Строчник', value: readerId, options: readers, select: setReaderId },
          { label: 'Садовник', value: gardenerId, options: gardeners, select: setGardenerId },
        ].map((selector) => (
          <label key={selector.label} className="grid gap-2 text-xs">
            {selector.label}
            <select
              aria-label={selector.label}
              className={controlClassName}
              value={selector.value}
              disabled={interpreter.active}
              onChange={(event) => {
                selector.select(event.target.value);
                interpreter.clear();
              }}
            >
              <option value="" disabled>
                Выберите машину
              </option>
              {selector.options.map(({ id, machine }) => (
                <option key={id} value={id}>
                  {machine.name || id}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="w-52 shrink-0">
          <SimulationRunPanel
            machineSelector={null}
            mode={mode}
            timeout={timeout}
            ready={
              interpreter.ready &&
              interpreter.supportsSession &&
              valid &&
              referenceError.length === 0 &&
              Boolean(parameters)
            }
            active={interpreter.active}
            error={error}
            message={interpreter.result?.message}
            stale={stale}
            onModeChange={setMode}
            onTimeoutChange={setTimeoutValue}
            onCancel={interpreter.cancel}
            onStart={() => {
              if (parameters) {
                setRunRevision(currentRevision);
                onStart(readerId, gardenerId, message, parameters, mode, timeout);
              }
            }}
          />
        </div>
        <section className="min-w-52 flex-1" aria-label="Общая лента импульсов">
          <h2 className="h2-header mb-2">Строчник → Садовник · Импульсы</h2>
          <ReaderResult result={readerResult} stale={stale} active={interpreter.active} />
        </section>
      </div>
      <div
        role="tablist"
        aria-label="Участники симуляции"
        className="flex gap-2 border-b border-border-primary"
      >
        {['reader', 'gardener'].map((id) => (
          <button
            key={id}
            role="tab"
            id={`joint-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`joint-panel-${id}`}
            className={twMerge('rounded-t-lg px-4 py-2 text-sm', tab === id && 'bg-bg-active')}
            onClick={() => setTab(id)}
          >
            {id === 'reader' ? 'Строчник' : 'Садовник'}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="joint-panel-reader"
        aria-labelledby="joint-tab-reader"
        hidden={tab !== 'reader'}
      >
        <FieldInput label="Входная строка" htmlFor="joint-reader-message">
          <textarea
            id="joint-reader-message"
            className={twMerge(controlClassName, 'h-32 py-2')}
            value={message}
            disabled={interpreter.active}
            onChange={(event) => setMessage(limitUnicodeCharacters(event.target.value, 10_000))}
          />
        </FieldInput>
      </div>
      <div
        role="tabpanel"
        id="joint-panel-gardener"
        aria-labelledby="joint-tab-gardener"
        hidden={tab !== 'gardener'}
      >
        <GardenerSimulator
          key={gardenerId}
          machineSelector={null}
          hideRunPanel
          onParametersChange={setParameters}
          ready={false}
          active={interpreter.active}
          result={gardenerResult}
          stale={stale}
          onStart={() => undefined}
          onCancel={interpreter.cancel}
        />
      </div>
    </div>
  );
};

export const Simulator: React.FC<SimulatorProps> = ({
  initialSmId,
  onStatusChange,
  onAutoSizeChange,
}) => {
  const modelController = useModelContext();
  const interpreter = useInterpreter();
  const [joint, setJoint] = useState(false);
  const [activeTask, solutionMachineId, selectSolution] = useTasks((state) => [
    getActiveTask(state),
    state.solutionMachineId,
    state.selectSolution,
  ]);
  const stateMachines = modelController.model.useData('', 'elements.stateMachinesId') as {
    [id: string]: StateMachine;
  };
  const allOptions = getSimulationMachineOptions(stateMachines);
  const options = activeTask
    ? allOptions.filter(
        ({ machine: optionMachine }) => optionMachine.platform === activeTask.platformId
      )
    : allOptions;
  const optionIds = JSON.stringify(options.map(({ id }) => id));
  const [selectedSmId, setSelectedSmId] = useState(() =>
    selectInitialMachineId(options, solutionMachineId ?? initialSmId)
  );
  const [lastRunRevision, setLastRunRevision] = useState<object>();
  const subscriptionSmId = selectedSmId ?? '';
  const statesRevision = modelController.model.useData(subscriptionSmId, 'elements.states');
  const transitionsRevision = modelController.model.useData(
    subscriptionSmId,
    'elements.transitions'
  );
  const componentsRevision = modelController.model.useData(subscriptionSmId, 'elements.components');
  const initialStatesRevision = modelController.model.useData(
    subscriptionSmId,
    'elements.initialStates'
  );
  const finalStatesRevision = modelController.model.useData(
    subscriptionSmId,
    'elements.finalStates'
  );
  const choiceStatesRevision = modelController.model.useData(
    subscriptionSmId,
    'elements.choiceStates'
  );
  const shallowHistoryRevision = modelController.model.useData(
    subscriptionSmId,
    'elements.shallowHistory'
  );
  const nameRevision = modelController.model.useData(subscriptionSmId, 'elements.name');
  const currentRevision = useMemo(
    () => ({}),
    [
      subscriptionSmId,
      statesRevision,
      transitionsRevision,
      componentsRevision,
      initialStatesRevision,
      finalStatesRevision,
      choiceStatesRevision,
      shallowHistoryRevision,
      nameRevision,
    ]
  );
  const machine = selectedSmId ? stateMachines[selectedSmId] : undefined;
  const platform = machine ? getPlatform(machine.platform) : undefined;
  const missingComponentReferences =
    machine && platform ? getMissingComponentReferences(machine, platform) : [];
  const referenceError =
    missingComponentReferences.length > 0
      ? `Нельзя запустить симуляцию: отсутствуют компоненты, на которые ссылается схема: ${missingComponentReferences.join(
          ', '
        )}. Восстановите компоненты или удалите ссылки.`
      : undefined;
  const resultStale = isSimulationResultStale(
    interpreter.result !== undefined,
    lastRunRevision,
    currentRevision
  );

  useEffect(() => {
    onStatusChange?.(interpreter.status);
  }, [interpreter.status, onStatusChange]);

  useEffect(() => {
    onAutoSizeChange?.(
      activeTask?.platformId === 'junior-gardener' ||
        (!activeTask &&
          (joint ||
            machine?.platform === 'junior-reader' ||
            machine?.platform === 'junior-gardener' ||
            machine?.platform === 'blg-mb-junior'))
    );
  }, [activeTask, joint, machine?.platform, onAutoSizeChange]);

  useEffect(() => {
    if (!activeTask) return;
    selectSolution(selectedSmId, undefined);
  }, [activeTask, currentRevision, selectSolution, selectedSmId]);

  useEffect(() => {
    if (!initialSmId || interpreter.active) return;
    if (options.some(({ id }) => id === initialSmId)) {
      setSelectedSmId(initialSmId);
      setLastRunRevision(undefined);
      interpreter.clear();
    }
    // initialSmId changes only when the Simulator workspace is opened for another machine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSmId]);

  useEffect(() => {
    if (interpreter.active || options.some(({ id }) => id === selectedSmId)) return;
    setSelectedSmId(selectInitialMachineId(options));
    setLastRunRevision(undefined);
    interpreter.clear();
    // optionIds represents the supported subset; options itself is rebuilt on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpreter.active, interpreter.clear, optionIds, selectedSmId]);

  const selectMachine = (smId: string) => {
    if (interpreter.active || smId === selectedSmId) return;
    setSelectedSmId(smId);
    setLastRunRevision(undefined);
    interpreter.clear();
  };

  const exportSelectedMachine = () => {
    if (!selectedSmId || !machine || referenceError) return undefined;
    const xml = exportStateMachineCGML(modelController.model.data.elements, selectedSmId);
    if (activeTask) selectSolution(selectedSmId, xml);
    return xml;
  };

  const start = (mode: SimulationMode, timeout: number, parameters: SimulationParameters) => {
    const xml = exportSelectedMachine();
    if (!selectedSmId || !xml) return;
    setLastRunRevision(currentRevision);
    interpreter.start({
      xml,
      machineId: selectedSmId,
      mode,
      ...(mode === 'finite' ? { timeoutSeconds: timeout } : {}),
      parameters,
    });
  };

  const runTaskTest = (testId: string) => {
    const xml = exportSelectedMachine();
    if (!activeTask || !selectedSmId || !xml) return;
    interpreter.startTest({
      xml,
      machineId: selectedSmId,
      task: taskForProtocol(activeTask),
      testId,
    });
  };

  const submitTask = () => {
    const xml = exportSelectedMachine();
    if (!activeTask || !selectedSmId || !xml) return;
    interpreter.startSubmission({
      xml,
      machineId: selectedSmId,
      task: taskForProtocol(activeTask),
    });
  };

  return (
    <div
      className={twMerge(
        'flex h-full min-h-0 flex-col bg-bg-primary text-text-primary',
        !onStatusChange && 'p-4'
      )}
    >
      {!onStatusChange && (
        <div className="mb-6 flex items-center gap-11 border-b border-border-primary pb-3 text-sm font-medium">
          <span>Симулятор</span>
          <span className="font-normal">
            <span className="font-medium">Статус: </span>
            <span className="text-primary">{interpreter.status}</span>
          </span>
        </div>
      )}
      {!activeTask && (
        <div className="mb-4 flex gap-2">
          <button
            className={twMerge(
              'rounded-lg border border-border-primary px-3 py-2 text-xs',
              !joint && 'bg-bg-active'
            )}
            disabled={interpreter.active}
            onClick={() => {
              setJoint(false);
              interpreter.clear();
            }}
          >
            Одна машина
          </button>
          <button
            className={twMerge(
              'rounded-lg border border-border-primary px-3 py-2 text-xs',
              joint && 'bg-bg-active'
            )}
            disabled={interpreter.active}
            onClick={() => {
              setJoint(true);
              interpreter.clear();
            }}
          >
            Строчник + Садовник
          </button>
        </div>
      )}
      {!activeTask && joint && (
        <JointSimulator
          options={allOptions}
          interpreter={interpreter}
          onStart={(readerId, gardenerId, message, parameters, mode, timeout) => {
            const elements = modelController.model.data.elements;
            const xml = exportCGML({
              parameters: elements.parameters,
              stateMachines: {
                [readerId]: elements.stateMachines[readerId],
                [gardenerId]: elements.stateMachines[gardenerId],
              },
            });
            interpreter.start({
              xml,
              mode,
              ...(mode === 'finite' ? { timeoutSeconds: timeout } : {}),
              machines: [
                { machineId: readerId, parameters: { message } },
                { machineId: gardenerId, parameters },
              ],
            });
          }}
        />
      )}
      {(activeTask ||
        (!joint &&
          machine?.platform !== 'junior-gardener' &&
          machine?.platform !== 'junior-reader' &&
          machine?.platform !== 'blg-mb-junior')) && (
        <div className="mb-4 w-64 max-w-full">
          <MachineSelector
            options={options}
            selectedSmId={selectedSmId}
            active={interpreter.active}
            onSelect={selectMachine}
          />
        </div>
      )}
      {activeTask && (
        <TaskMode
          task={activeTask}
          ready={interpreter.ready && !referenceError}
          active={interpreter.active}
          operationKind={interpreter.operationKind}
          liveTestId={interpreter.activeTestId}
          liveExecution={interpreter.operationKind === 'test' ? interpreter.result : undefined}
          error={referenceError ?? interpreter.error}
          hasSolution={machine !== undefined}
          onRunTest={runTaskTest}
          onCancel={interpreter.cancel}
          onSubmit={submitTask}
        />
      )}
      {!activeTask && !joint && machine?.platform === 'blg-mb-junior' && (
        <CyberBearSimulator
          {...interpreter}
          ready={interpreter.ready && interpreter.supportsCyberBear && !referenceError}
          error={
            referenceError ??
            interpreter.error ??
            (interpreter.ready && !interpreter.supportsCyberBear
              ? 'Обновите интерпретатор: эта версия не поддерживает отправку байтов КиберМишке по расписанию.'
              : undefined)
          }
          machineSelector={
            <MachineSelector
              options={options}
              selectedSmId={selectedSmId}
              active={interpreter.active}
              onSelect={selectMachine}
            />
          }
          stale={resultStale}
          onStart={start}
          onCancel={interpreter.cancel}
        />
      )}
      {!activeTask && !joint && machine?.platform === 'junior-gardener' && (
        <GardenerSimulator
          {...interpreter}
          ready={interpreter.ready && !referenceError}
          error={referenceError ?? interpreter.error}
          machineSelector={
            <MachineSelector
              options={options}
              selectedSmId={selectedSmId}
              active={interpreter.active}
              onSelect={selectMachine}
            />
          }
          stale={resultStale}
          onStart={start}
          onCancel={interpreter.cancel}
        />
      )}
      {!activeTask && !joint && machine?.platform === 'junior-reader' && (
        <ReaderSimulator
          {...interpreter}
          ready={interpreter.ready && !referenceError}
          error={referenceError ?? interpreter.error}
          machineSelector={
            <MachineSelector
              options={options}
              selectedSmId={selectedSmId}
              active={interpreter.active}
              onSelect={selectMachine}
            />
          }
          stale={resultStale}
          onStart={start}
          onCancel={interpreter.cancel}
        />
      )}
    </div>
  );
};
