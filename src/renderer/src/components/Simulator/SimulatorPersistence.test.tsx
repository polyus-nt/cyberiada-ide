import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { emptyStateMachine } from '@renderer/types/diagram';
import type { InterpreterEnvelope, RunStartPayload } from '@renderer/types/InterpreterTypes';

const client = vi.hoisted(() => ({
  ready: true,
  activeRunId: undefined as string | undefined,
  activeKind: undefined as 'run' | undefined,
  capabilities: new Set(['run.session']),
  bind: vi.fn(),
  cancel: vi.fn(),
  start: vi.fn(),
  subscribeMessages: vi.fn(),
  listener: undefined as ((message: InterpreterEnvelope) => void) | undefined,
}));
vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: () => [undefined] }));
vi.mock('../Modules/Interpreter', () => ({ InterpreterClient: client }));
vi.mock('@renderer/assets/icons/arrow-down.svg', () => ({
  ReactComponent: () => <svg />,
}));
vi.mock('@renderer/components/UI', () => ({
  ParameterSelect: ({ inputId, options, value, isDisabled, onChange }) => (
    <select
      id={inputId}
      value={value?.value}
      disabled={isDisabled}
      onChange={(event) => onChange(options.find((item) => item.value === event.target.value))}
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('@renderer/lib/data/GraphmlBuilder', () => ({
  exportCGML: () => '<session/>',
  exportStateMachineCGML: () => '<single/>',
}));
vi.mock('@renderer/lib/data/ComponentReferences', () => ({
  getMissingComponentReferences: () => [],
}));
vi.mock('@renderer/lib/data/PlatformLoader', () => ({ getPlatform: () => ({}) }));
vi.mock('@renderer/store/ModelContext', () => ({ useModelContext: () => model }));
vi.mock('@renderer/store/useTasks', () => ({
  getActiveTask: () => undefined,
  useTasks: () => [undefined, undefined, vi.fn()],
}));
vi.mock('./TaskMode', () => ({ TaskMode: () => null }));

import { simulatorSessionState } from './sessionState';
import { Simulator } from './Simulator';

const stateMachines = {
  reader: { ...emptyStateMachine(), platform: 'junior-reader', name: 'Строчник' },
  gardener: { ...emptyStateMachine(), platform: 'junior-gardener', name: 'Садовник' },
};
const model = {
  model: {
    data: { basename: '/project/example.graphml', elements: { stateMachines } },
    useData: (id: keyof typeof stateMachines, property: string) =>
      property === 'elements.stateMachinesId'
        ? stateMachines
        : stateMachines[id]?.[property.split('.')[1]],
  },
};
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const render = () => act(() => root.render(<Simulator initialSmId="reader" />));
const click = (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(
    (node) => node.textContent === text
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  act(() => button.click());
};
const input = (selector: string) => {
  const node = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    selector
  );
  if (!node) throw new Error(`Missing input: ${selector}`);
  return node;
};
const change = (selector: string, value: string) =>
  act(() => {
    const node = input(selector);
    node.value = value;
    Simulate.change(node);
  });
const reopen = () => {
  act(() => root.unmount());
  root = createRoot(container);
  render();
};
const complete = (payload: InterpreterEnvelope['payload']) =>
  act(() => {
    client.activeRunId = undefined;
    client.activeKind = undefined;
    client.listener?.({
      protocolVersion: 2,
      type: 'run.completed',
      runId: 'run',
      requestId: 'request',
      payload,
    });
  });

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  simulatorSessionState.setState({ values: {} });
  localStorage.clear();
  vi.clearAllMocks();
  model.model.data.basename = '/project/example.graphml';
  client.activeRunId = undefined;
  client.activeKind = undefined;
  client.subscribeMessages.mockImplementation((listener) => {
    client.listener = listener;
    return () => {
      client.listener = undefined;
    };
  });
  client.start.mockImplementation(() => {
    client.activeRunId = 'run';
    client.activeKind = 'run';
    return 'run';
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it('retains independent drafts and results across modes and closing the simulator', async () => {
  render();
  change('textarea', 'одна машина');
  change('#simulator-timeout', '7');
  click('Запустить');
  complete({ status: 'success', result: { signals: [], calledSignals: ['impulseA'] } });
  expect(container.textContent).toContain('Импульс А');
  click('Строчник + Садовник');
  change('#joint-reader-message', 'совместная');
  change('#simulator-timeout', '21');
  click('Садовник');
  change('#simulator-field-width', '4');
  change('#simulator-field-height', '3');
  change('#simulator-position-x', '2');
  change('#simulator-orientation', 'south');
  click('Роза');
  const cell = container.querySelector('[aria-label="Клетка 1, 1: пустая клетка"]');
  if (!cell) throw new Error('Missing field cell');
  act(() => Simulate.mouseDown(cell, { button: 0 }));
  click('Запустить');
  const payload = client.start.mock.lastCall?.[0] as RunStartPayload;
  expect(payload).toMatchObject({
    mode: 'finite',
    timeoutSeconds: 21,
    machines: [
      { machineId: 'reader', parameters: { message: 'совместная' } },
      {
        machineId: 'gardener',
        parameters: { width: 4, height: 3, position: { x: 2, y: 0 }, orientation: 'SOUTH' },
      },
    ],
  });
  complete({
    status: 'success',
    machines: {
      reader: { status: 'success', result: { signals: [], calledSignals: ['impulseB'] } },
    },
  });
  click('Одна машина состояний');
  expect(input('textarea').value).toBe('одна машина');
  expect(input('#simulator-timeout').value).toBe('7');
  expect(container.textContent).toContain('Импульс А');
  expect(container.textContent).not.toContain('Результат устарел');
  reopen();
  expect(input('textarea').value).toBe('одна машина');
  expect(container.textContent).toContain('Импульс А');
  click('Строчник + Садовник');
  expect(input('#joint-reader-message').value).toBe('совместная');
  expect(input('#simulator-timeout').value).toBe('21');
  expect(input('#simulator-field-width').value).toBe('4');
  expect(input('#simulator-field-height').value).toBe('3');
  expect(input('#simulator-position-x').value).toBe('2');
  expect(input('#simulator-orientation').value).toBe('south');
  expect(container.querySelector('[aria-label="Клетка 1, 1: роза"]')).not.toBeNull();
  expect(container.querySelector('#joint-panel-gardener')?.hasAttribute('hidden')).toBe(false);
  expect(container.textContent).toContain('Импульс Б');
  expect(container.textContent).not.toContain('Результат устарел');
  await act(async () => {
    await Promise.resolve();
  });
});

it('restores drafts from disk after a fresh session and isolates documents', () => {
  render();
  change('textarea', 'сохранённая строка');
  click('Строчник + Садовник');
  change('#joint-reader-message', 'две машины');
  click('Садовник');
  change('#simulator-field-width', '5');
  act(() => root.unmount());
  simulatorSessionState.setState({ values: {} });
  root = createRoot(container);
  render();
  expect(input('#joint-reader-message').value).toBe('две машины');
  expect(input('#simulator-field-width').value).toBe('5');
  click('Одна машина состояний');
  expect(input('textarea').value).toBe('сохранённая строка');
  model.model.data = { ...model.model.data, basename: '/project/other.graphml' };
  render();
  expect(input('textarea').value).toBe('');
  model.model.data = { ...model.model.data, basename: '/project/example.graphml' };
  render();
  expect(input('textarea').value).toBe('сохранённая строка');
  model.model.data.basename = '/project/saved-as.graphml';
  render();
  expect(input('textarea').value).toBe('сохранённая строка');
  act(() => root.unmount());
  simulatorSessionState.setState({ values: {} });
  root = createRoot(container);
  render();
  expect(input('textarea').value).toBe('сохранённая строка');
});

it('keeps the selected machine and history position when reopened, and marks edited results stale', () => {
  render();
  change('#simulator-state-machine', 'gardener');
  click('Запустить');
  const steps = [0, 1].map((x) => ({
    field: [[0, 0]],
    position: { x, y: 0 },
    orientation: 'east',
  }));
  complete({ status: 'success', steps });
  change('[aria-label="Шаг истории"]', '0');
  click('Строчник + Садовник');
  click('Одна машина состояний');
  expect(input('#simulator-state-machine').value).toBe('gardener');
  expect(input('[aria-label="Шаг истории"]').value).toBe('0');
  expect(container.textContent).toContain('Просмотр шага 1 из 2.');
  reopen();
  expect(input('#simulator-state-machine').value).toBe('gardener');
  expect(input('[aria-label="Шаг истории"]').value).toBe('0');
  expect(container.textContent).not.toContain('Результат устарел');
  act(() => root.unmount());
  const name = stateMachines.gardener.name;
  stateMachines.gardener.name = 'Изменённая машина';
  root = createRoot(container);
  render();
  expect(container.textContent).toContain('Результат устарел');
  stateMachines.gardener.name = name;
});

it('retains the latest snapshot when closing cancels a running simulation', () => {
  render();
  click('Запустить');
  act(() =>
    client.listener?.({
      protocolVersion: 2,
      type: 'run.state',
      runId: 'run',
      requestId: 'request',
      payload: { platform: 'junior-reader', impulses: ['impulseC'] },
    })
  );
  expect(container.textContent).toContain('Импульс В');
  act(() => root.unmount());
  expect(client.cancel).toHaveBeenCalledWith('run');
  client.activeRunId = undefined;
  client.activeKind = undefined;
  root = createRoot(container);
  render();
  expect(container.textContent).toContain('Импульс В');
  expect(container.textContent).toContain('Запустить');
});
