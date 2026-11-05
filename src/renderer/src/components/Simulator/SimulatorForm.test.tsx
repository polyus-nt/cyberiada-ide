import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { expect, it, vi } from 'vitest';

vi.mock('@renderer/assets/icons/arrow-down.svg', () => ({
  ReactComponent: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}));

vi.mock('@renderer/components/UI', () => ({ ParameterSelect: () => <select /> }));
vi.mock('@renderer/lib/data/GraphmlBuilder', () => ({
  exportCGML: vi.fn(),
  exportStateMachineCGML: vi.fn(),
}));
vi.mock('@renderer/lib/data/PlatformLoader', () => ({ getPlatform: () => ({}) }));
vi.mock('@renderer/store/ModelContext', () => ({ useModelContext: () => model }));
vi.mock('@renderer/store/useTasks', () => ({
  getActiveTask: () => undefined,
  useTasks: () => [undefined, undefined, selectSolution],
}));
vi.mock('./useInterpreter', () => ({ useInterpreter: () => interpreter }));
vi.mock('./TaskMode', () => ({ TaskMode: () => null }));
vi.mock('./CyberBearSimulator', () => ({ CyberBearSimulator: () => null }));
vi.mock('./ReaderResult', () => ({ ReaderResult: () => null }));

import { emptyStateMachine } from '@renderer/types/diagram';

import { Simulator } from './Simulator';

const stateMachines = {
  reader: { ...emptyStateMachine(), platform: 'junior-reader', name: 'Строчник' },
  gardener: { ...emptyStateMachine(), platform: 'junior-gardener', name: 'Садовник' },
  bear: { ...emptyStateMachine(), platform: 'blg-mb-junior', name: 'КиберМишка' },
};
const model = {
  model: {
    data: { elements: { stateMachines } },
    useData: (id: keyof typeof stateMachines, property: string) =>
      property === 'elements.stateMachinesId'
        ? stateMachines
        : stateMachines[id]?.[property.split('.')[1]],
  },
};
const selectSolution = vi.fn();
const interpreter = {
  ready: true,
  active: false,
  supportsSession: true,
  cancel: vi.fn(),
  clear: vi.fn(),
  start: vi.fn(),
};

it.each(['reader', 'gardener', 'bear'])(
  'keeps window sizing stable when switching modes from %s without submitting the modal form',
  (initialSmId) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onAutoSizeChange = vi.fn();
    const click = (text: string) => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (element) => element.textContent === text
      );
      if (!button) throw new Error(`Missing button: ${text}`);
      act(() => button.click());
    };
    try {
      // MovingModal supplies a form around Simulator in the desktop application.
      act(() =>
        root.render(
          <form onSubmit={submit}>
            <Simulator initialSmId={initialSmId} onAutoSizeChange={onAutoSizeChange} />
          </form>
        )
      );
      expect(onAutoSizeChange).toHaveBeenLastCalledWith(false);
      click('Строчник + Садовник');
      expect(onAutoSizeChange).toHaveBeenLastCalledWith(false);
      expect(container.querySelector('[role="tablist"]')).not.toBeNull();
      expect(submit).not.toHaveBeenCalled();
      click('Садовник');
      expect(container.querySelector('#joint-panel-gardener')?.hasAttribute('hidden')).toBe(false);
      expect(submit).not.toHaveBeenCalled();
      click('Строчник');
      expect(container.querySelector('#joint-panel-reader')?.hasAttribute('hidden')).toBe(false);
      expect(submit).not.toHaveBeenCalled();
      click('Одна машина');
      expect(onAutoSizeChange.mock.calls.every(([autoSize]) => autoSize === false)).toBe(true);
      expect(container.querySelector('[role="tablist"]')).toBeNull();
      expect(submit).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  }
);
