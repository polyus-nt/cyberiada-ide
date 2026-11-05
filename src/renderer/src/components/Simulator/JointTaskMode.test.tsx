import React from 'react';

import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { expect, it, vi } from 'vitest';

import type { StateMachine } from '@renderer/types/diagram';

import { JointTaskMode } from './Simulator';
import type { useInterpreter } from './useInterpreter';

import type { CatalogTask } from '../../../../common/tasks';

const mocks = vi.hoisted(() => ({
  machines: {
    r: { platform: 'junior-reader', name: 'Строчник', states: {} },
    r2: { platform: 'junior-reader', name: 'Другой строчник', states: {} },
    g: { platform: 'junior-gardener', name: 'Садовник', states: {} },
  } as unknown as Record<string, StateMachine>,
  exportCGML: vi.fn(() => '<two-machines/>'),
  missing: [] as string[],
}));
vi.mock('@renderer/assets/icons/arrow-down.svg', () => ({ ReactComponent: () => <svg /> }));
vi.mock('@renderer/components/UI', () => ({
  ParameterSelect: ({
    inputId,
    options,
    value,
    onChange,
    isDisabled,
  }: {
    inputId: string;
    options: { value: string; label: string }[];
    value?: { value: string };
    onChange: (option: { value: string }) => void;
    isDisabled: boolean;
  }) => (
    <select
      id={inputId}
      value={value?.value ?? ''}
      disabled={isDisabled}
      onChange={(event) => onChange({ value: event.target.value })}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('@renderer/lib/data/GraphmlBuilder', () => ({
  exportCGML: mocks.exportCGML,
  exportStateMachineCGML: vi.fn(),
}));
vi.mock('@renderer/lib/data/ComponentReferences', () => ({
  getMissingComponentReferences: () => mocks.missing,
}));
vi.mock('@renderer/lib/data/PlatformLoader', () => ({ getPlatform: () => ({}) }));
vi.mock('@renderer/store/ModelContext', () => ({
  useModelContext: () => ({
    model: {
      useData: () => '',
      data: { elements: { stateMachines: mocks.machines, parameters: {} } },
    },
  }),
}));
vi.mock('./useInterpreter', () => ({ useInterpreter: vi.fn() }));
vi.mock('./CyberBearSimulator', () => ({ CyberBearSimulator: () => null }));

import { useTasks } from '../../store/useTasks';

it('exports both selected diagrams, runs tests and submissions, and invalidates results on either change', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const task: CatalogTask = {
    schemaVersion: 1,
    id: 'joint',
    version: 1,
    title: 'Посадка по радио',
    summary: 'Радио',
    description: 'Радио',
    assetBaseUrl: '',
    platformId: 'reader-gardener',
    tests: [
      {
        id: 'example',
        title: 'Пример',
        input: {
          reader: { message: 'А' },
          gardener: {
            width: 2,
            height: 1,
            field: [[0, 0]],
            position: { x: 0, y: 0 },
            orientation: 'EAST',
          },
        },
        checks: [{ type: 'gardener.position.equals', expected: { x: 1, y: 0 } }],
      },
    ],
  };
  useTasks.getState().setCatalog({ tasks: [task], diagnostics: [], assetRootUrl: '' });
  useTasks.getState().startTask(task.id);
  const startTest = vi.fn();
  const startSubmission = vi.fn();
  const interpreter = {
    ready: true,
    active: false,
    supportsTaskSession: true,
    clear: vi.fn(),
    startTest,
    startSubmission,
    cancel: vi.fn(),
  } as unknown as ReturnType<typeof useInterpreter>;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = () =>
    act(() =>
      root.render(
        <JointTaskMode
          task={task}
          options={Object.entries(mocks.machines).map(([id, machine]) => ({ id, machine }))}
          interpreter={interpreter}
        />
      )
    );
  const run = () => {
    const button = container.querySelector<HTMLButtonElement>('[title="Запустить тест"]');
    if (!button) throw new Error('Missing test button');
    return button;
  };
  try {
    render();
    act(() => run().click());
    expect(startTest).toHaveBeenCalledWith(
      expect.objectContaining({
        xml: '<two-machines/>',
        machines: { reader: 'r', gardener: 'g' },
        testId: 'example',
      })
    );
    expect(mocks.exportCGML).toHaveBeenCalledWith(
      expect.objectContaining({ stateMachines: { r: mocks.machines.r, g: mocks.machines.g } })
    );
    expect(useTasks.getState().solutionXml).toBe('<two-machines/>');
    act(() =>
      useTasks
        .getState()
        .completeTrial(
          'example',
          { testId: 'example', status: 'passed', outcome: { status: 'success' } },
          { status: 'success' }
        )
    );
    expect(useTasks.getState().testStates.example.phase).toBe('passed');
    mocks.machines.g.name = 'Изменённый садовник';
    render();
    expect(useTasks.getState().testStates.example.phase).toBe('idle');
    const reader = container.querySelector<HTMLSelectElement>('#task-reader');
    if (!reader) throw new Error('Missing reader selector');
    act(() => {
      reader.value = 'r2';
      Simulate.change(reader);
    });
    act(() => run().click());
    expect(startTest).toHaveBeenLastCalledWith(
      expect.objectContaining({ machines: { reader: 'r2', gardener: 'g' } })
    );
    const submit = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Отправить решение')
    );
    if (!submit) throw new Error('Missing submit button');
    act(() => submit.click());
    expect(startSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ machines: { reader: 'r2', gardener: 'g' } })
    );
    interpreter.supportsTaskSession = false;
    render();
    expect(run().disabled).toBe(true);
    interpreter.supportsTaskSession = true;
    interpreter.error = 'Предыдущая ошибка';
    render();
    expect(run().disabled).toBe(false);
    mocks.missing = ['deleted'];
    render();
    expect(run().disabled).toBe(true);
  } finally {
    act(() => root.unmount());
    container.remove();
    useTasks.getState().endTask();
    mocks.missing = [];
    vi.unstubAllGlobals();
  }
});
