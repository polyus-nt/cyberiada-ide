import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@renderer/components/UI', () => ({
  ParameterSelect: ({
    inputId,
    options,
    value,
    isDisabled,
    onChange,
  }: {
    inputId: string;
    options: { value: string; label: string }[];
    value?: { value: string };
    isDisabled?: boolean;
    onChange: (option: { value: string; label: string } | undefined) => void;
  }) => (
    <select
      id={inputId}
      value={value?.value}
      disabled={isDisabled}
      onChange={(event) => onChange(options.find((option) => option.value === event.target.value))}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import { createCyberBearState } from './cyberBearModel';
import { CyberBearSimulator } from './CyberBearSimulator';

describe('CyberBear simulator', () => {
  it('waits for blur before showing field errors while blocking invalid runs', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    const root = createRoot(container);
    const onStart = vi.fn();
    const change = (input: HTMLInputElement, value: string) =>
      act(() => {
        input.value = value;
        Simulate.change(input);
      });
    const click = (text: string) => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (item) => item.textContent === text
      );
      if (!button) throw new Error(`Missing button: ${text}`);
      act(() => button.click());
    };

    try {
      act(() =>
        root.render(
          <CyberBearSimulator
            ready
            active={false}
            stale={false}
            machineSelector={<span>Машина</span>}
            onStart={onStart}
            onCancel={vi.fn()}
          />
        )
      );
      click('Добавить элемент');
      const value = container.querySelector<HTMLInputElement>('[id^="cyberbear-value-"]');
      const time = container.querySelector<HTMLInputElement>('[id^="cyberbear-time-"]');
      if (!value || !time) throw new Error('Missing sequence inputs');
      expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
      expect(container.textContent).not.toContain('Укажите');
      click('Запустить');
      expect(onStart).not.toHaveBeenCalled();

      // Visiting the valid time must not expose the untouched byte error.
      act(() => Simulate.blur(time));
      expect(container.textContent).not.toContain('Укажите');
      change(value, '256');
      expect(container.textContent).not.toContain('Укажите');
      act(() => Simulate.blur(value));
      expect(value.getAttribute('aria-invalid')).toBe('true');
      expect(time.getAttribute('aria-invalid')).toBe('false');
      expect(container.textContent).toContain('Укажите байт от 0 до 255');
      const description = value.getAttribute('aria-describedby');
      expect(container.querySelector(`[id="${description}"]`)?.textContent).toContain(
        'Укажите байт'
      );

      change(value, '0xFF');
      expect(container.textContent).not.toContain('Укажите');
      click('Запустить');
      expect(onStart).toHaveBeenCalledWith('finite', 10, {
        inputs: [{ channel: 'ir', byte: 255, timeMs: 0 }],
      });

      change(time, '-1');
      expect(time.getAttribute('aria-invalid')).toBe('true');
      expect(value.getAttribute('aria-invalid')).toBe('false');
      click('Добавить элемент');
      const newValue = container.querySelectorAll<HTMLInputElement>('[id^="cyberbear-value-"]')[1];
      const newTime = container.querySelectorAll<HTMLInputElement>('[id^="cyberbear-time-"]')[1];
      expect(newTime.value).toBe('-1');
      expect(newTime.getAttribute('aria-invalid')).toBe('false');
      expect(newValue.getAttribute('aria-invalid')).toBe('false');

      const moveDown = container.querySelector<HTMLButtonElement>(
        '[aria-label="Опустить элемент 1"]'
      );
      if (!moveDown) throw new Error('Missing reorder button');
      act(() => moveDown.click());
      expect(time.getAttribute('aria-invalid')).toBe('true');
      expect(newTime.getAttribute('aria-invalid')).toBe('false');
      act(() => Simulate.blur(newTime));
      expect(newTime.getAttribute('aria-invalid')).toBe('true');
      expect(newValue.getAttribute('aria-invalid')).toBe('false');
    } finally {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('starts with the selected input and updates visual state during execution', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    const root = createRoot(container);
    const onStart = vi.fn();
    const props = {
      ready: true,
      active: false,
      stale: false,
      machineSelector: <span>Машина</span>,
      onStart,
      onCancel: vi.fn(),
    };
    try {
      act(() => root.render(<CyberBearSimulator {...props} />));
      const add = () => {
        const button = Array.from(container.querySelectorAll('button')).find(
          (item) => item.textContent === 'Добавить элемент'
        );
        if (!button) throw new Error('Missing add input button');
        act(() => button.click());
      };
      const change = (prefix: string, index: number, value: string) => {
        const control = container.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          `[id^="${prefix}"]`
        )[index];
        if (!control) throw new Error('Missing sequence control');
        act(() => {
          control.value = value;
          Simulate.change(control);
        });
      };
      add();
      change('cyberbear-value-', 0, '204');
      change('cyberbear-time-', 0, '0');
      add();
      change('cyberbear-channel-', 1, 'ears');
      change('cyberbear-time-', 1, '500');
      change('cyberbear-value-', 1, '0x2A');
      add();
      change('cyberbear-channel-', 2, 'ir');
      change('cyberbear-value-', 2, '168');
      change('cyberbear-time-', 2, '1500');
      const moveDown = container.querySelector<HTMLButtonElement>(
        '[aria-label="Опустить элемент 2"]'
      );
      if (!moveDown) throw new Error('Missing reorder button');
      act(() => moveDown.click());
      expect(
        Array.from(container.querySelectorAll<HTMLInputElement>('[id^="cyberbear-value-"]')).map(
          (input) => input.value
        )
      ).toEqual(['204', '168', '0x2A']);
      const moveUp = container.querySelector<HTMLButtonElement>('[aria-label="Поднять элемент 3"]');
      if (!moveUp) throw new Error('Missing reorder button');
      act(() => moveUp.click());
      add();
      const remove = container.querySelector<HTMLButtonElement>('[aria-label="Удалить элемент 4"]');
      if (!remove) throw new Error('Missing remove button');
      act(() => remove.click());
      expect(container.querySelector('[id^="cyberbear-kind-"]')).toBeNull();
      expect(
        Array.from(container.querySelectorAll<HTMLInputElement>('[id^="cyberbear-time-"]')).map(
          (input) => input.value
        )
      ).toEqual(['0', '500', '1500']);
      const start = container.querySelector('button');
      if (!start) throw new Error('Missing start button');
      act(() => start.click());
      expect(onStart).toHaveBeenCalledWith('finite', 10, {
        inputs: [
          { channel: 'ir', byte: 204, timeMs: 0 },
          { channel: 'ears', byte: 42, timeMs: 500 },
          { channel: 'ir', byte: 168, timeMs: 1500 },
        ],
      });
      const state = createCyberBearState();
      state.eyes.right = [10, 0, 0, 10];
      state.matrix[6][4] = 75;
      act(() => root.render(<CyberBearSimulator {...props} active cyberBear={state} />));
      expect(container.textContent).toContain('Выполняется');
      expect(
        Array.from(container.querySelectorAll<HTMLInputElement>('[id^="cyberbear-time-"]')).every(
          (input) => input.disabled
        )
      ).toBe(true);
      expect(container.querySelector('svg')?.textContent).toContain('Правый глаз: 10, 0, 0, 10');
      expect(container.querySelector('svg')?.textContent).toContain('Строка 7, столбец 5: 75%');
      expect(container.textContent).not.toContain('длительности свечения');
      expect(
        Array.from(container.querySelectorAll<HTMLInputElement>('[id^="cyberbear-value-"]')).every(
          (input) => input.disabled
        )
      ).toBe(true);
      expect(
        Array.from(
          container.querySelectorAll<HTMLSelectElement>('[id^="cyberbear-channel-"]')
        ).every((select) => select.disabled)
      ).toBe(true);
    } finally {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
