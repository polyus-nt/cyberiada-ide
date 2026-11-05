import { describe, expect, it } from 'vitest';

import { taskForProtocol } from './taskProtocol';

import type { CatalogTask } from '../../../../common/tasks';

describe('taskForProtocol', () => {
  it('removes presentation masks before sending tests to the interpreter', () => {
    const task: CatalogTask = {
      schemaVersion: 1,
      id: 'masked-gardener',
      version: 1,
      title: 'Masked Gardener',
      summary: 'Summary',
      description: 'Description',
      platformId: 'junior-gardener',
      assetBaseUrl: 'file:///tasks/',
      tests: [
        {
          id: 'first',
          title: 'First',
          input: {
            width: 2,
            height: 1,
            field: [[0, 1]],
            position: { x: 0, y: 0 },
            orientation: 'EAST',
          },
          checks: [{ type: 'gardener.field.equals', expected: [[0, 1]] }],
          hiddenCells: [[false, true]],
        },
      ],
    };

    const protocolTask = taskForProtocol(task);

    expect(protocolTask.tests[0]).not.toHaveProperty('hiddenCells');
    expect(protocolTask.tests[0].input).toEqual(task.tests[0].input);
    expect(task.tests[0].hiddenCells).toEqual([[false, true]]);
  });
});

it('sends checker source and scenario settings while preserving presentation-only secrecy flags', () => {
  const task = {
    schemaVersion: 2 as const,
    id: 'bear',
    version: 1,
    title: 'Bear',
    summary: 'Summary',
    description: 'Description',
    platformId: 'blg-mb-junior' as const,
    assetBaseUrl: 'file:///tasks/bear/',
    checker: {
      apiVersion: 1 as const,
      source: 'def check(case, execution): return {"passed": True}',
    },
    tests: [
      {
        id: 'first',
        title: 'First',
        input: { durationMs: 2000, inputs: [] },
        checks: [{ type: 'python' as const }],
        hideInputs: true,
      },
    ],
  };
  const protocol = taskForProtocol(task);
  expect(protocol.checker).toEqual(task.checker);
  expect(protocol.tests[0].input).toEqual(task.tests[0].input);
  expect(protocol.tests[0].hideInputs).toBe(true);
  expect(protocol).not.toHaveProperty('assetBaseUrl');
});
