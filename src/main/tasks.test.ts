import { afterEach, describe, expect, it } from 'vitest';

import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { loadTaskCatalog } from './tasks';

import { readTaskFixture } from '../../tests/taskFixtures';

const temporaryDirectories: string[] = [];

const temporaryTaskRoot = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lapki-task-catalog-'));
  temporaryDirectories.push(root);
  return root;
};

const bundledTask = () => readTaskFixture('resources/tasks/gardener-letter-a.task.json');

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

  it('loads Markdown and resolves inline and reference images beside the Markdown file', () => {
    const root = temporaryTaskRoot();
    const directory = path.join(root, 'statement');
    mkdirSync(directory);
    const task = { ...bundledTask(), description: undefined };
    writeFileSync(
      path.join(root, 'example.task.json'),
      JSON.stringify({ ...task, descriptionFile: 'statement/example.md' })
    );
    const markdown =
      '# Условие\n\n![Поле](<field image.png> "Иллюстрация")\n\n![Схема][map]\n\n[map]: field%20image.png?cache=1#view\n\n```md\n![Пример](missing.png)\n```';
    writeFileSync(path.join(directory, 'example.md'), markdown);
    writeFileSync(path.join(directory, 'field image.png'), 'image');

    const catalog = loadTaskCatalog(root);
    expect(catalog.diagnostics).toEqual([]);
    expect(catalog.tasks[0].description).toBe(markdown);
    expect(catalog.tasks[0].assetBaseUrl).toContain('/statement/');
    expect(catalog.tasks[0]).not.toHaveProperty('descriptionFile');
  });

  it.each([
    ['missing.md', undefined, 'ENOENT'],
    ['empty.md', '  \n', 'непустой строкой'],
    ['long.md', 'a'.repeat(100001), '100000 символов'],
    ['large.md', 'a'.repeat(400001), '400 КБ'],
    ['description.txt', 'text', 'файл .md'],
    ['https://example.com/statement.md', undefined, 'локальный относительный путь'],
  ])('reports an invalid description file: %s', (file, content, message) => {
    const root = temporaryTaskRoot();
    const task = { ...bundledTask(), description: undefined };
    writeFileSync(
      path.join(root, 'invalid.task.json'),
      JSON.stringify({ ...task, descriptionFile: file })
    );
    if (content !== undefined) writeFileSync(path.join(root, file), content);
    const catalog = loadTaskCatalog(root);
    expect(catalog.tasks).toEqual([]);
    expect(catalog.diagnostics[0]).toEqual({
      file: 'invalid.task.json',
      message: expect.stringContaining(message),
    });
  });

  it('rejects absolute paths and existing files outside the catalog', () => {
    const outer = temporaryTaskRoot();
    const root = path.join(outer, 'catalog');
    mkdirSync(root);
    const outside = path.join(outer, 'outside.md');
    writeFileSync(outside, 'External');
    const task = { ...bundledTask(), description: undefined };
    for (const file of [outside, '../outside.md']) {
      writeFileSync(
        path.join(root, 'invalid.task.json'),
        JSON.stringify({ ...task, descriptionFile: file })
      );
      const catalog = loadTaskCatalog(root);
      expect(catalog.tasks).toEqual([]);
      expect(catalog.diagnostics).toHaveLength(1);
    }
  });

  it.skipIf(process.platform === 'win32')('rejects a Markdown symlink escaping the catalog', () => {
    const outer = temporaryTaskRoot();
    const root = path.join(outer, 'catalog');
    mkdirSync(root);
    const outside = path.join(outer, 'outside.md');
    writeFileSync(outside, 'External');
    symlinkSync(outside, path.join(root, 'statement.md'));
    const task = { ...bundledTask(), description: undefined };
    writeFileSync(
      path.join(root, 'invalid.task.json'),
      JSON.stringify({ ...task, descriptionFile: 'statement.md' })
    );
    expect(loadTaskCatalog(root).diagnostics[0].message).toContain('выходит за пределы');
  });

  it.each(['![Поле](../outside.png)', '![Поле][map]\n\n[map]: ../outside.png'])(
    'checks image containment using Markdown syntax: %s',
    (description) => {
      const outer = temporaryTaskRoot();
      const root = path.join(outer, 'catalog');
      mkdirSync(root);
      writeFileSync(path.join(outer, 'outside.png'), 'image');
      writeFileSync(
        path.join(root, 'invalid.task.json'),
        JSON.stringify({ ...bundledTask(), description })
      );
      expect(loadTaskCatalog(root).diagnostics[0].message).toContain('выходит за пределы');
    }
  );

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
    expect(catalog.tasks.filter((entry) => entry.schemaVersion === 1)).toHaveLength(19);
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
  const task = readTaskFixture(
    'resources/tasks/bear-station-callsign/bear-station-callsign.task.json'
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
