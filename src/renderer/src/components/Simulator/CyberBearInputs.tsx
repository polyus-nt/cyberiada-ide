import React, { useState } from 'react';

import { nanoid } from 'nanoid';

import { ReactComponent as MoveDownIcon } from '@renderer/assets/icons/move-down.svg';
import { ReactComponent as MoveUpIcon } from '@renderer/assets/icons/move-up.svg';
import { ParameterSelect } from '@renderer/components/UI';
import { AddButton } from '@renderer/components/UI/AddButton';
import { DeleteButton } from '@renderer/components/UI/DeleteButton';
import { ScrollArea } from '@renderer/components/UI/ScrollArea';
import type { CyberBearChannel } from '@renderer/types/InterpreterTypes';

import {
  CyberBearInputDraft,
  cyberBearByteError,
  cyberBearTimeError,
  MAX_CYBERBEAR_INPUTS,
  swapCyberBearInputs,
} from './cyberBearModel';

const channels: { value: CyberBearChannel; label: string }[] = [
  { value: 'ir', label: 'ИК' },
  { value: 'ears', label: 'Акустика' },
];
const rowButton =
  'flex size-5 shrink-0 items-center justify-center rounded text-xs disabled:opacity-40 enabled:hover:bg-bg-hover';

const CyberBearInputFields: React.FC<{
  input: CyberBearInputDraft;
  active: boolean;
  onChange: (patch: Partial<CyberBearInputDraft>) => void;
}> = ({ input, active, onChange }) => {
  const [touched, setTouched] = useState({ timeMs: false, value: false });
  const timeError = touched.timeMs ? cyberBearTimeError(input.timeMs) : undefined;
  const valueError = touched.value ? cyberBearByteError(input.value) : undefined;

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_70px] items-start gap-2">
        <label className="grid min-w-0 gap-2 text-xs" htmlFor={`cyberbear-channel-${input.id}`}>
          Канал
          <ParameterSelect
            inputId={`cyberbear-channel-${input.id}`}
            options={channels}
            value={channels.find((option) => option.value === input.channel)}
            isDisabled={active}
            isSearchable={false}
            isClearable={false}
            onChange={(option) => {
              if (option) onChange({ channel: option.value });
            }}
          />
        </label>
        <label className="grid min-w-0 gap-2 text-xs" htmlFor={`cyberbear-value-${input.id}`}>
          Байт
          <input
            id={`cyberbear-value-${input.id}`}
            className="h-8 min-w-0 rounded-lg border border-border-primary bg-bg-primary px-3 disabled:text-text-inactive"
            value={input.value}
            maxLength={10}
            disabled={active}
            placeholder="0–255"
            aria-invalid={Boolean(valueError)}
            aria-describedby={valueError ? `cyberbear-error-value-${input.id}` : undefined}
            onBlur={() => setTouched((previous) => ({ ...previous, value: true }))}
            onChange={(event) => onChange({ value: event.target.value })}
          />
          {valueError && (
            <span id={`cyberbear-error-value-${input.id}`} className="text-xs text-error">
              {valueError}
            </span>
          )}
        </label>
      </div>
      <label className="grid min-w-0 gap-2 text-xs" htmlFor={`cyberbear-time-${input.id}`}>
        Время
        <span className="flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-border-primary bg-bg-primary px-3 focus-within:outline focus-within:outline-1 focus-within:outline-primary">
          <input
            id={`cyberbear-time-${input.id}`}
            className="w-full min-w-0 flex-1 bg-transparent outline-none disabled:text-text-inactive"
            inputMode="numeric"
            aria-label="Время, мс"
            value={input.timeMs}
            disabled={active}
            placeholder="0"
            aria-invalid={Boolean(timeError)}
            aria-describedby={timeError ? `cyberbear-error-time-${input.id}` : undefined}
            onBlur={() => setTouched((previous) => ({ ...previous, timeMs: true }))}
            onChange={(event) => onChange({ timeMs: event.target.value })}
          />
          <span className="shrink-0 text-text-inactive">мс</span>
        </span>
        {timeError && (
          <span id={`cyberbear-error-time-${input.id}`} className="text-xs text-error">
            {timeError}
          </span>
        )}
      </label>
    </div>
  );
};

export const CyberBearInputs: React.FC<{
  inputs: CyberBearInputDraft[];
  active: boolean;
  onChange: (inputs: CyberBearInputDraft[]) => void;
}> = ({ inputs, active, onChange }) => {
  const [expandedId, setExpandedId] = useState<string>();
  const [draggedId, setDraggedId] = useState<string>();
  const [dropTargetId, setDropTargetId] = useState<string>();
  const update = (index: number, patch: Partial<CyberBearInputDraft>) =>
    onChange(inputs.map((input, current) => (current === index ? { ...input, ...patch } : input)));
  const move = (index: number, direction: number) => {
    if (!active) onChange(swapCyberBearInputs(inputs, index, index + direction));
  };
  const endDrag = () => {
    setDraggedId(undefined);
    setDropTargetId(undefined);
  };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex min-h-5 items-center gap-3">
        <h2 className="h2-header">Входная последовательность</h2>
        <AddButton
          aria-label="Добавить элемент"
          title="Добавить элемент"
          disabled={active || inputs.length >= MAX_CYBERBEAR_INPUTS}
          onClick={() => {
            const input: CyberBearInputDraft = {
              id: nanoid(),
              channel: inputs[inputs.length - 1]?.channel ?? 'ir',
              timeMs: inputs[inputs.length - 1]?.timeMs ?? '0',
              value: '',
            };
            onChange([...inputs, input]);
            setExpandedId(input.id);
          }}
        />
      </div>
      {inputs.length > 0 && (
        <ScrollArea
          className="h-auto max-h-[420px] rounded-lg border border-border-primary py-0"
          viewportClassName="p-3"
          reserveVerticalScrollbarSpace
          horizontalScroll={false}
        >
          <ol className="space-y-1.5">
            {inputs.map((input, index) => (
              <li
                key={input.id}
                className={`group overflow-hidden rounded-lg border ${
                  expandedId === input.id ? '' : 'hover:bg-bg-hover'
                } ${
                  !active && dropTargetId === input.id
                    ? 'border-primary bg-bg-hover'
                    : 'border-border-primary'
                } ${!active && draggedId === input.id ? 'opacity-50' : ''}`}
                onDragOver={(event) => {
                  if (active || !draggedId) return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = 'move';
                  setDropTargetId(input.id === draggedId ? undefined : input.id);
                }}
                onDragLeave={(event) => {
                  if (
                    !(event.relatedTarget instanceof Node) ||
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    setDropTargetId(undefined);
                  }
                }}
                onDrop={(event) => {
                  if (!draggedId) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (!active) {
                    const from = inputs.findIndex(({ id }) => id === draggedId);
                    if (from !== index && from !== -1) {
                      onChange(swapCyberBearInputs(inputs, from, index));
                    }
                  }
                  endDrag();
                }}
              >
                <div className="relative">
                  <button
                    type="button"
                    className="grid h-[30px] w-full min-w-0 grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-1 pl-3 pr-[96px] text-left text-xs focus-visible:outline-primary"
                    aria-label={`${expandedId === input.id ? 'Свернуть' : 'Раскрыть'} элемент ${
                      index + 1
                    }`}
                    aria-expanded={expandedId === input.id}
                    aria-controls={`cyberbear-input-editor-${input.id}`}
                    title={`Время: ${input.timeMs || '—'} мс; канал: ${
                      input.channel === 'ir' ? 'ИК' : 'Акустика'
                    }; байт: ${input.value || '—'}${
                      active ? '' : '\nПеретащите на другой байт, чтобы обменять их время отправки.'
                    }`}
                    draggable={!active && inputs.length > 1}
                    style={{
                      cursor: active ? undefined : draggedId === input.id ? 'grabbing' : 'grab',
                    }}
                    onDragStart={(event) => {
                      if (active) {
                        event.preventDefault();
                        return;
                      }
                      event.stopPropagation();
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('application/x-cyberbear-input', input.id);
                      setDraggedId(input.id);
                    }}
                    onDragEnd={endDrag}
                    onClick={() =>
                      setExpandedId((current) => (current === input.id ? undefined : input.id))
                    }
                  >
                    <span className="text-text-inactive">{index + 1}</span>
                    <span className="truncate tabular-nums">
                      {input.channel === 'ir' ? 'ИК' : 'АК'} {input.value || '—'}
                    </span>
                    <span className="flex min-w-0 max-w-[76px] items-center whitespace-nowrap tabular-nums">
                      <span className="truncate">{input.timeMs || '—'}</span>
                      <span className="shrink-0">&nbsp;мс</span>
                    </span>
                  </button>
                  <div
                    className={`absolute right-3 top-[5px] flex items-center gap-1.5 ${
                      expandedId === input.id
                        ? ''
                        : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      className={rowButton}
                      aria-label={`Поднять элемент ${index + 1}`}
                      disabled={active || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <MoveUpIcon className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={rowButton}
                      aria-label={`Опустить элемент ${index + 1}`}
                      disabled={active || index === inputs.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <MoveDownIcon className="size-5" aria-hidden="true" />
                    </button>
                    <DeleteButton
                      className={rowButton}
                      aria-label={`Удалить элемент ${index + 1}`}
                      disabled={active}
                      onClick={() => {
                        if (expandedId === input.id) setExpandedId(undefined);
                        onChange(inputs.filter((_, current) => current !== index));
                      }}
                    />
                  </div>
                </div>
                <div
                  id={`cyberbear-input-editor-${input.id}`}
                  hidden={expandedId !== input.id}
                  className="p-3 pt-4"
                >
                  <CyberBearInputFields
                    input={input}
                    active={active}
                    onChange={(patch) => update(index, patch)}
                  />
                </div>
              </li>
            ))}
          </ol>
        </ScrollArea>
      )}
      {inputs.length === 0 && (
        <p className="mb-3 text-xs text-text-inactive">Нет входных байтов.</p>
      )}
    </section>
  );
};
