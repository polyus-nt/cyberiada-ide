import { afterEach, describe, expect, it } from 'vitest';

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { loadTaskCatalog } from './tasks';

const temporaryDirectories: string[] = [];

const temporaryTaskRoot = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lapki-task-catalog-'));
  temporaryDirectories.push(root);
  return root;
};

const bundledTask = () =>
  JSON.parse(readFileSync('resources/tasks/gardener-letter-a.task.json', 'utf8'));

describe('loadTaskCatalog', () => {
  afterEach(() => {
    temporaryDirectories
      .splice(0)
      .forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  });

  it('discovers task files recursively without a manifest', () => {
    const root = temporaryTaskRoot();
    const nested = path.join(root, 'gardener');
    mkdirSync(nested);
    writeFileSync(path.join(nested, 'letter-a.task.json'), JSON.stringify(bundledTask()));

    const catalog = loadTaskCatalog(root);

    expect(catalog.tasks.map((task) => task.id)).toEqual(['gardener-letter-a']);
    expect(catalog.diagnostics).toEqual([]);
  });

  it('rejects every file involved in a duplicate identifier', () => {
    const root = temporaryTaskRoot();
    writeFileSync(path.join(root, 'first.task.json'), JSON.stringify(bundledTask()));
    writeFileSync(path.join(root, 'second.task.json'), JSON.stringify(bundledTask()));

    const catalog = loadTaskCatalog(root);

    expect(catalog.tasks).toEqual([]);
    expect(catalog.diagnostics.map((diagnostic) => diagnostic.file).sort()).toEqual([
      'first.task.json',
      'second.task.json',
    ]);
  });

  it('loads valid tasks while reporting invalid files', () => {
    const root = temporaryTaskRoot();
    writeFileSync(path.join(root, 'valid.task.json'), JSON.stringify(bundledTask()));
    writeFileSync(path.join(root, 'invalid.task.json'), '{');

    const catalog = loadTaskCatalog(root);

    expect(catalog.tasks).toHaveLength(1);
    expect(catalog.diagnostics[0].file).toBe('invalid.task.json');
  });

  it('loads illustrated Gardener tasks from the bundled catalog', () => {
    const catalog = loadTaskCatalog(path.resolve('resources/tasks'));
    const task = catalog.tasks.find((entry) => entry.id === 'gardener-cosmic-delivery');
    const cartographer = catalog.tasks.find(
      (entry) => entry.id === 'gardener-uncounting-cartographer'
    );
    const cornflowerPath = catalog.tasks.find((entry) => entry.id === 'gardener-cornflower-path');

    expect(catalog.diagnostics).toEqual([]);
    expect(catalog.tasks.filter((entry) => entry.schemaVersion === 1)).toHaveLength(18);
    expect(
      catalog.tasks.filter((entry) => entry.schemaVersion === 1).every((entry) => entry.codeWord)
    ).toBe(true);
    expect(task?.tests).toHaveLength(1);
    expect(task?.description).toContain('![Схема космической станции](cosmic-delivery.png)');
    expect(task?.assetBaseUrl).toContain('/gardener-cosmic-delivery/');
    expect(cartographer?.tests).toHaveLength(5);
    expect(cartographer?.title).toBe('"Неуч"-картограф');
    expect(cartographer?.description).toContain(
      '![Неточная карта сада](uncounting-cartographer.png)'
    );
    expect(cartographer?.assetBaseUrl).toContain('/gardener-uncounting-cartographer/');
    expect(cornflowerPath?.description).toContain('(cornflower-path.png)');
  });
});

it('loads checker source from a task package and reports missing or escaping paths', () => {
  const root = temporaryTaskRoot();
  const nested = path.join(root, 'bear');
  mkdirSync(nested);
  const task = JSON.parse(
    readFileSync('resources/tasks/bear-station-callsign/bear-station-callsign.task.json', 'utf8')
  );
  const file = path.join(nested, 'bear.task.json');
  writeFileSync(file, JSON.stringify(task));
  expect(loadTaskCatalog(root).diagnostics).toHaveLength(1);
  writeFileSync(
    path.join(nested, 'checker.py'),
    'def check(case, execution):\n    return {"passed": True}'
  );
  const catalog = loadTaskCatalog(root);
  expect(catalog.diagnostics).toEqual([]);
  expect(catalog.tasks[0].checker?.source).toContain('def check(');
  expect(catalog.tasks[0].checker?.file).toBeUndefined();
  task.checker.file = '../outside.py';
  writeFileSync(path.join(root, 'outside.py'), 'invalid');
  writeFileSync(file, JSON.stringify(task));
  expect(loadTaskCatalog(root).tasks).toEqual([]);
  expect(loadTaskCatalog(root).diagnostics[0].message).toContain('выходит за пределы');
});

it('discovers all bundled CyberBear task packages', () => {
  const catalog = loadTaskCatalog(path.resolve('resources/tasks'));
  expect(catalog.diagnostics).toEqual([]);
  const tasks = catalog.tasks.filter((task) => task.platformId === 'blg-mb-junior');
  expect(tasks.map((task) => task.id).sort()).toEqual([
    'bear-dice',
    'bear-station-callsign',
    'bear-two-halves',
  ]);
  expect(tasks.every((task) => task.checker?.source && task.schemaVersion === 2)).toBe(true);
  expect(
    tasks.find((task) => task.id === 'bear-two-halves')?.tests.some((test) => test.hideInputs)
  ).toBe(true);
});
