import { fromMarkdown } from 'mdast-util-from-markdown';

import { Dirent, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { basePath } from './utils';

import { parseProgrammingTask, TaskCatalog, TaskDiagnostic } from '../common/tasks';

const MAX_TASK_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DESCRIPTION_FILE_BYTES = 400_000;

const resolveCatalogFile = (
  reference: string,
  sourceFile: string,
  root: string,
  urlReference = false
): string => {
  if (
    path.isAbsolute(reference) ||
    path.win32.isAbsolute(reference) ||
    /^[a-z][a-z0-9+.-]*:/i.test(reference)
  ) {
    throw new Error(`файл ${reference} должен иметь локальный относительный путь`);
  }
  const canonicalRoot = realpathSync(root);
  const target = urlReference
    ? fileURLToPath(new URL(reference, pathToFileURL(path.resolve(sourceFile))))
    : path.resolve(path.dirname(sourceFile), reference);
  const resolved = realpathSync(target);
  if (!resolved.startsWith(canonicalRoot + path.sep) || !statSync(resolved).isFile()) {
    throw new Error(`файл ${reference} выходит за пределы каталога задач`);
  }
  return resolved;
};

const validateTaskImages = (description: string, taskFile: string, root: string) => {
  const tree = fromMarkdown(description);
  const definitions = new Map<string, string>();
  const images: string[] = [];
  const references: string[] = [];
  const visit = (node: (typeof tree)['children'][number] | typeof tree) => {
    if (node.type === 'definition' && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url);
    }
    if (node.type === 'image') images.push(node.url);
    if (node.type === 'imageReference') references.push(node.identifier);
    if ('children' in node) node.children.forEach(visit);
  };
  visit(tree);
  for (const identifier of references) {
    const url = definitions.get(identifier);
    if (url !== undefined) images.push(url);
  }
  for (const reference of images) {
    resolveCatalogFile(reference, taskFile, root, true);
  }
};

const findTaskFiles = (directory: string): string[] => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry: Dirent) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findTaskFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.task.json') ? [entryPath] : [];
  });
};

export const loadTaskCatalog = (root = path.join(basePath, 'tasks')): TaskCatalog => {
  const diagnostics: TaskDiagnostic[] = [];
  const sourceFiles = new WeakMap<object, string>();
  const tasks = findTaskFiles(root)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((filePath) => {
      const relativeFile = path.relative(root, filePath);
      try {
        if (statSync(filePath).size > MAX_TASK_FILE_BYTES) {
          throw new Error('файл превышает 2 МБ');
        }
        let descriptionPath = filePath;
        const task = parseProgrammingTask(JSON.parse(readFileSync(filePath, 'utf8')), (file) => {
          if (path.extname(file).toLowerCase() !== '.md') {
            throw new Error('task.descriptionFile должен указывать на файл .md');
          }
          descriptionPath = resolveCatalogFile(file, filePath, root);
          if (statSync(descriptionPath).size > MAX_DESCRIPTION_FILE_BYTES) {
            throw new Error('файл описания превышает 400 КБ');
          }
          return readFileSync(descriptionPath, 'utf8');
        });
        validateTaskImages(task.description, descriptionPath, root);
        if (task.checker?.file) {
          const directory = realpathSync(path.dirname(filePath));
          if (path.isAbsolute(task.checker.file))
            throw new Error('Путь checker.file должен быть относительным');
          const checkerPath = realpathSync(path.resolve(directory, task.checker.file));
          if (!checkerPath.startsWith(directory + path.sep) || !statSync(checkerPath).isFile())
            throw new Error('Проверяющий модуль выходит за пределы каталога задачи');
          if (statSync(checkerPath).size > 256000)
            throw new Error('Проверяющий модуль превышает 256 КБ');
          const source = readFileSync(checkerPath, 'utf8');
          if (!source.trim()) throw new Error('Проверяющий модуль пуст');
          task.checker = { apiVersion: 1, source };
        }
        let assetBaseUrl = pathToFileURL(path.dirname(descriptionPath) + path.sep).toString();
        if (!assetBaseUrl.endsWith('/')) assetBaseUrl += '/';
        const catalogTask = { ...task, assetBaseUrl };
        sourceFiles.set(catalogTask, relativeFile);
        return [catalogTask];
      } catch (error) {
        diagnostics.push({
          file: relativeFile,
          message: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    });

  const duplicateIds = new Set<string>();
  const firstFiles = new Map<string, { file: string; reported: boolean }>();
  for (const task of tasks) {
    const first = firstFiles.get(task.id);
    if (first) {
      duplicateIds.add(task.id);
      if (!first.reported) {
        diagnostics.push({
          file: first.file,
          message: `идентификатор ${task.id} повторяется; конфликтующие файлы пропущены`,
        });
        first.reported = true;
      }
      diagnostics.push({
        file: sourceFiles.get(task) ?? task.id,
        message: `идентификатор ${task.id} повторяется; конфликтующие файлы пропущены`,
      });
    } else {
      firstFiles.set(task.id, {
        file: sourceFiles.get(task) ?? task.id,
        reported: false,
      });
    }
  }

  return {
    tasks: tasks
      .filter((task) => !duplicateIds.has(task.id))
      .sort((left, right) => left.title.localeCompare(right.title, 'ru')),
    diagnostics,
    assetRootUrl: pathToFileURL(
      (existsSync(root) ? realpathSync(root) : path.resolve(root)) + path.sep
    ).toString(),
  };
};
