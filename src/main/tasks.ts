import { Dirent, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { basePath } from './utils';

import { parseProgrammingTask, TaskCatalog, TaskDiagnostic } from '../common/tasks';

const MAX_TASK_FILE_BYTES = 2 * 1024 * 1024;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\(([^)]+)\)/g;

const validateTaskImages = (description: string, taskFile: string, root: string) => {
  const canonicalRoot = realpathSync(root);
  for (const match of description.matchAll(MARKDOWN_IMAGE)) {
    const reference = match[1].trim();
    if (path.isAbsolute(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference)) {
      throw new Error(`изображение ${reference} должно иметь локальный относительный путь`);
    }
    const imagePath = realpathSync(path.resolve(path.dirname(taskFile), reference));
    if (!imagePath.startsWith(canonicalRoot + path.sep) || !statSync(imagePath).isFile()) {
      throw new Error(`изображение ${reference} выходит за пределы каталога задач`);
    }
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
        const task = parseProgrammingTask(JSON.parse(readFileSync(filePath, 'utf8')));
        validateTaskImages(task.description, filePath, root);
        let assetBaseUrl = pathToFileURL(path.dirname(filePath) + path.sep).toString();
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
    assetRootUrl: pathToFileURL(path.resolve(root) + path.sep).toString(),
  };
};
