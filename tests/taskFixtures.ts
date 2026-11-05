import { readFileSync } from 'fs';
import path from 'path';

// Resolve presentation files when copying bundled tasks into isolated test fixtures.
export const readTaskFixture = (file: string) => {
  const task = JSON.parse(readFileSync(file, 'utf8'));
  if (task.descriptionFile !== undefined) {
    task.description = readFileSync(path.resolve(path.dirname(file), task.descriptionFile), 'utf8');
    delete task.descriptionFile;
  }
  return task;
};
