import React, { useState } from 'react';

import { nanoid } from 'nanoid';

import { ParameterSelect } from '@renderer/components/UI';
import type { CyberBearChannel } from '@renderer/types/InterpreterTypes';

import {
  CyberBearInputDraft,
  cyberBearByteError,
  cyberBearTimeError,
  MAX_CYBERBEAR_INPUTS,
} from './cyberBearModel';

const channels: { value: CyberBearChannel; label: string }[] = [
  { value: 'ir', label: 'ИК' },
  { value: 'ears', label: 'Акустика' },
];
const rowButton =
  'size-7 rounded border border-border-primary text-xs disabled:opacity-40 enabled:hover:bg-bg-hover';

const CyberBearInputFields: React.FC<{
  input: CyberBearInputDraft;
  active: boolean;
  onChange: (patch: Partial<CyberBearInputDraft>) => void;
}> = ({ input, active, onChange }) => {
  const [touched, setTouched] = useState({ timeMs: false, value: false });
  const timeError = touched.timeMs ? cyberBearTimeError(input.timeMs) : undefined;
  const valueError = touched.value ? cyberBearByteError(input.value) : undefined;

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-2">
      <label className="grid gap-1 text-xs" htmlFor={`cyberbear-time-${input.id}`}>
        Время, мс
        <input
          id={`cyberbear-time-${input.id}`}
          className="h-8 min-w-0 rounded-lg border border-border-primary bg-bg-primary px-2 disabled:text-text-inactive"
          inputMode="numeric"
          value={input.timeMs}
          disabled={active}
          placeholder="0"
          aria-invalid={Boolean(timeError)}
          aria-describedby={timeError ? `cyberbear-error-time-${input.id}` : undefined}
          onBlur={() => setTouched((previous) => ({ ...previous, timeMs: true }))}
          onChange={(event) => onChange({ timeMs: event.target.value })}
        />
        {timeError && (
          <span id={`cyberbear-error-time-${input.id}`} className="text-xs text-error">
            {timeError}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-xs" htmlFor={`cyberbear-value-${input.id}`}>
        Байт
        <input
          id={`cyberbear-value-${input.id}`}
          className="h-8 min-w-0 rounded-lg border border-border-primary bg-bg-primary px-2 disabled:text-text-inactive"
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
  );
};

export const CyberBearInputs: React.FC<{
  inputs: CyberBearInputDraft[];
  active: boolean;
  onChange: (inputs: CyberBearInputDraft[]) => void;
}> = ({ inputs, active, onChange }) => {
  const update = (index: number, patch: Partial<CyberBearInputDraft>) =>
    onChange(inputs.map((input, current) => (current === index ? { ...input, ...patch } : input)));
  const move = (index: number, direction: number) => {
    const next = [...inputs];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };

  return (
    <section>
      <h2 className="h2-header mb-3">Входная последовательность</h2>
      <ol className="max-h-[420px] space-y-3 overflow-y-auto">
        {inputs.map((input, index) => (
          <li key={input.id} className="space-y-2 rounded-lg border border-border-primary p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-inactive">{index + 1}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={rowButton}
                  aria-label={`Поднять элемент ${index + 1}`}
                  disabled={active || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={rowButton}
                  aria-label={`Опустить элемент ${index + 1}`}
                  disabled={active || index === inputs.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={rowButton}
                  aria-label={`Удалить элемент ${index + 1}`}
                  disabled={active}
                  onClick={() => onChange(inputs.filter((_, current) => current !== index))}
                >
                  ×
                </button>
              </div>
            </div>
            <label className="grid gap-1 text-xs" htmlFor={`cyberbear-channel-${input.id}`}>
              Канал
              <ParameterSelect
                inputId={`cyberbear-channel-${input.id}`}
                options={channels}
                value={channels.find((option) => option.value === input.channel)}
                isDisabled={active}
                isSearchable={false}
                isClearable={false}
                onChange={(option) => {
                  if (option) update(index, { channel: option.value });
                }}
              />
            </label>
            <CyberBearInputFields
              input={input}
              active={active}
              onChange={(patch) => update(index, patch)}
            />
          </li>
        ))}
      </ol>
      {inputs.length === 0 && (
        <p className="mb-3 text-xs text-text-inactive">Нет входных байтов.</p>
      )}
      <button
        type="button"
        className="mt-2 h-8 w-full rounded-lg border border-border-primary px-3 text-xs enabled:hover:bg-bg-hover disabled:opacity-40"
        disabled={active || inputs.length >= MAX_CYBERBEAR_INPUTS}
        onClick={() =>
          onChange([
            ...inputs,
            {
              id: nanoid(),
              channel: inputs[inputs.length - 1]?.channel ?? 'ir',
              timeMs: inputs[inputs.length - 1]?.timeMs ?? '0',
              value: '',
            },
          ])
        }
      >
        Добавить элемент
      </button>
    </section>
  );
};
