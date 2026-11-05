import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { expect, it, vi } from 'vitest';

vi.mock('@renderer/assets/icons/arrow-down.svg', () => ({
  ReactComponent: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}));

vi.mock('@renderer/components/UI', () => ({ ParameterSelect: () => <select /> }));
vi.mock('@renderer/lib/data/GraphmlBuilder', () => ({
  exportCGML: vi.fn(),
  exportStateMachineCGML: vi.fn(),
}));
vi.mock('@renderer/lib/data/ComponentReferences', () => ({
  getMissingComponentReferences: () => [],
}));
vi.mock('@renderer/lib/data/PlatformLoader', () => ({ getPlatform: () => ({}) }));
vi.mock('@renderer/store/ModelContext', () => ({
  useModelContext: () => ({
    model: {
      useData: () => '',
      data: { elements: { stateMachines: {} } },
    },
  }),
}));
vi.mock('@renderer/store/useTasks', () => ({ getActiveTask: vi.fn(), useTasks: vi.fn() }));
vi.mock('./useInterpreter', () => ({ useInterpreter: vi.fn() }));
vi.mock('./TaskMode', () => ({ TaskMode: () => null }));
vi.mock('./CyberBearSimulator', () => ({ CyberBearSimulator: () => null }));
vi.mock('./ReaderResult', () => ({ ReaderResult: () => null }));

import type { SimulationMachineOption } from './selection';
import { JointSimulator } from './Simulator';
import type { useInterpreter } from './useInterpreter';

it('keeps input and field configuration across tabs and switches tabs during the common run', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onStart = vi.fn();
  const cancel = vi.fn();
  const interpreter = {
    ready: true,
    active: false,
    supportsSession: true,
    cancel,
    clear: vi.fn(),
  } as unknown as ReturnType<typeof useInterpreter>;
  const options = [
    { id: 'reader', machine: { platform: 'junior-reader', name: 'Мой Строчник' } },
    { id: 'gardener', machine: { platform: 'junior-gardener', name: 'Мой Садовник' } },
  ] as SimulationMachineOption[];
  const button = (text: string) => {
    const node = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent === text
    );
    if (!node) throw new Error(`Missing button: ${text}`);
    return node;
  };
  try {
    act(() =>
      root.render(<JointSimulator options={options} interpreter={interpreter} onStart={onStart} />)
    );
    const input = container.querySelector<HTMLTextAreaElement>('#joint-reader-message');
    if (!input) throw new Error('Missing input');
    act(() => {
      input.value = 'АБВ';
      Simulate.change(input);
    });
    act(() => button('Садовник').click());
    const width = container.querySelector<HTMLInputElement>('#simulator-field-width');
    if (!width) throw new Error('Missing field width');
    act(() => {
      width.value = '4';
      Simulate.change(width);
    });
    act(() => button('Строчник').click());
    expect(input.value).toBe('АБВ');
    expect(width.value).toBe('4');
    act(() => button('Запустить').click());
    expect(onStart).toHaveBeenCalledWith(
      'reader',
      'gardener',
      'АБВ',
      expect.objectContaining({ width: 4 }),
      'finite',
      10
    );
    act(() =>
      root.render(
        <JointSimulator
          options={options}
          interpreter={{
            ...interpreter,
            active: true,
            result: {
              status: 'running',
              machines: {
                reader: { status: 'running', result: { signals: [], calledSignals: ['impulseA'] } },
              },
            },
          }}
          onStart={onStart}
        />
      )
    );
    expect(input.disabled).toBe(true);
    act(() => button('Садовник').click());
    expect(container.querySelector('#joint-panel-gardener')?.hasAttribute('hidden')).toBe(false);
    const impulses = container.querySelector('[aria-label="Выходные импульсы Строчника"]');
    expect(impulses?.textContent).toContain('Импульс А');
    expect(impulses?.closest('[role="tabpanel"]')?.id).toBe('joint-panel-reader');
    expect(impulses?.closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(true);
    act(() => Simulate.keyDown(button('Садовник'), { key: 'ArrowLeft' }));
    expect(button('Строчник').getAttribute('aria-selected')).toBe('true');
    expect(impulses?.closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(false);
    expect(document.activeElement).toBe(button('Строчник'));
    expect(input.value).toBe('АБВ');
    expect(width.value).toBe('4');
    expect(cancel).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
