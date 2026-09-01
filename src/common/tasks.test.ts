import { describe, expect, it } from 'vitest';

import { readFileSync } from 'fs';

import {
  DEFAULT_TEST_TIMEOUT_SECONDS,
  MAX_TASK_TOTAL_TIMEOUT_SECONDS,
  parseProgrammingTask,
} from './tasks';

const validTask = () => ({
  schemaVersion: 1,
  id: 'reader-echo',
  version: 1,
  title: 'Reader',
  summary: 'Summary',
  description: 'Description',
  platformId: 'junior-reader',
  tests: [
    {
      id: 'first',
      title: 'First',
      input: { message: 'abc' },
      checks: [{ type: 'reader.impulses.equals', expected: ['impulseA'] }],
    },
  ],
});

describe('parseProgrammingTask', () => {
  it('accepts a strict Reader task and preserves an omitted timeout', () => {
    const task = parseProgrammingTask(validTask());

    expect(task.tests[0].timeoutSeconds).toBeUndefined();
    expect(DEFAULT_TEST_TIMEOUT_SECONDS).toBe(10);
  });

  it('rejects unknown schema fields', () => {
    expect(() => parseProgrammingTask({ ...validTask(), typo: true })).toThrow(
      'не поддерживается schemaVersion 1'
    );
  });

  it('rejects checks for another platform', () => {
    const task = validTask();
    task.tests[0].checks = [{ type: 'gardener.field.equals', expected: [] }];

    expect(() => parseProgrammingTask(task)).toThrow('не поддерживается платформой junior-reader');
  });

  it('rejects a task whose effective timeout total is too large', () => {
    const task = validTask();
    task.tests = Array.from({ length: 31 }, (_, index) => ({
      ...task.tests[0],
      id: `test-${index}`,
      timeoutSeconds: 10,
    }));

    expect(() => parseProgrammingTask(task)).toThrow(
      `превышает ${MAX_TASK_TOTAL_TIMEOUT_SECONDS} секунд`
    );
  });

  it('validates the bundled Gardener letter A task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/gardener-letter-a.task.json', 'utf8'))
    );

    expect(task.id).toBe('gardener-letter-a');
    expect(task.tests.map((test) => (test.input as { width: number }).width)).toEqual([5, 8, 7]);
  });

  it('validates the bundled Gardener letter B task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/gardener-letter-b.task.json', 'utf8'))
    );

    expect(task.id).toBe('gardener-letter-b');
    expect(
      task.tests.map((test) => {
        const input = test.input as { width: number; height: number; position: { x: number; y: number } };
        return [input.width, input.height, input.position.x, input.position.y];
      })
    ).toEqual([
      [7, 7, 0, 0],
      [5, 7, 0, 0],
      [8, 9, 0, 0],
    ]);
  });

  it('validates the bundled Gardener greeting task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/gardener-hello.task.json', 'utf8'))
    );

    expect(task.id).toBe('gardener-hello');
    expect(task.tests).toHaveLength(1);
  });

  it('validates the bundled Gardener mint abundance task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/gardener-mint-abundance.task.json', 'utf8'))
    );

    expect(task.id).toBe('gardener-mint-abundance');
    expect(
      task.tests.map((test) => {
        const input = test.input as { width: number; height: number; orientation: string };
        return [input.width, input.height, input.orientation];
      })
    ).toEqual([
      [3, 2, 'SOUTH'],
      [6, 4, 'SOUTH'],
      [5, 7, 'SOUTH'],
    ]);
  });

  it('validates the bundled Reader digits groups task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/reader-digits-groups-over-33.task.json', 'utf8'))
    );

    expect(task.id).toBe('reader-digits-groups-over-33');
    expect(task.tests.map((test) => (test.input as { message: string }).message)).toEqual([
      '5-9999',
      '10-20-4',
      '99999',
      '9999-9999',
      '9876-999',
    ]);
  });
});
