export const TASK_SCHEMA_VERSION = 1 as const;
export const DEFAULT_TEST_TIMEOUT_SECONDS = 10;
export const MAX_TASK_TESTS = 32;
export const MAX_TASK_TOTAL_TIMEOUT_SECONDS = 300;

export type TaskPlatformId =
  | 'junior-gardener'
  | 'junior-reader'
  | 'blg-mb-junior'
  | 'reader-gardener';
export type GardenerCell = -1 | 0 | 1 | 2 | 3;
export type GardenerOrientation = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface GardenerTaskInput {
  width: number;
  height: number;
  field: GardenerCell[][];
  position: { x: number; y: number };
  orientation: GardenerOrientation;
}

export interface ReaderTaskInput {
  message: string;
}

export interface ReaderGardenerTaskInput {
  reader: ReaderTaskInput;
  gardener: GardenerTaskInput;
}

export interface CyberBearTaskInput {
  durationMs: number;
  inputs: { channel: 'ir' | 'ears'; byte: number; timeMs: number }[];
  random?: { seed?: number; values?: number[]; streams?: Record<string, number[]> };
}

export interface TaskChecker {
  apiVersion: 1;
  file?: string;
  source?: string;
}

export type GardenerFieldCheck = {
  type: 'gardener.field.equals';
  expected: GardenerCell[][];
};

export type GardenerPositionCheck = {
  type: 'gardener.position.equals';
  expected: { x: number; y: number };
};

export type ReaderImpulsesCheck = {
  type: 'reader.impulses.equals';
  expected: Array<'impulseA' | 'impulseB' | 'impulseC'>;
};

export type VerificationCheck =
  | GardenerFieldCheck
  | GardenerPositionCheck
  | ReaderImpulsesCheck
  | { type: 'python' };

export interface VerificationTest {
  id: string;
  title: string;
  timeoutSeconds?: number;
  input: GardenerTaskInput | ReaderTaskInput | CyberBearTaskInput | ReaderGardenerTaskInput;
  parameters?: Record<string, unknown>;
  hideInputs?: boolean;
  checks: VerificationCheck[];
  hiddenCells?: boolean[][];
}

export interface ProgrammingTask {
  schemaVersion: 1 | 2;
  checker?: TaskChecker;
  id: string;
  version: number;
  title: string;
  summary: string;
  description: string;
  codeWord?: string;
  platformId: TaskPlatformId;
  tests: VerificationTest[];
}

export interface CatalogTask extends ProgrammingTask {
  assetBaseUrl: string;
}

export interface TaskDiagnostic {
  file: string;
  message: string;
}

export interface TaskCatalog {
  tasks: CatalogTask[];
  diagnostics: TaskDiagnostic[];
  assetRootUrl: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertObject = (value: unknown, path: string): Record<string, unknown> => {
  if (!isObject(value)) throw new Error(`${path} должно быть объектом`);
  return value;
};

const assertExactKeys = (
  value: Record<string, unknown>,
  required: string[],
  optional: string[],
  path: string
) => {
  for (const key of required) {
    if (!(key in value)) throw new Error(`${path}.${key} обязательно`);
  }
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`${path}.${unknown} не поддерживается schemaVersion 1`);
};

const assertString = (value: unknown, path: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} должно быть непустой строкой`);
  }
  if (value.length > maxLength) throw new Error(`${path} превышает ${maxLength} символов`);
  return value;
};

const assertInteger = (value: unknown, path: string, min: number, max: number): number => {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`${path} должно быть целым числом от ${min} до ${max}`);
  }
  return value as number;
};

const assertPosition = (value: unknown, path: string, width: number, height: number) => {
  const position = assertObject(value, path);
  assertExactKeys(position, ['x', 'y'], [], path);
  return {
    x: assertInteger(position.x, `${path}.x`, 0, width - 1),
    y: assertInteger(position.y, `${path}.y`, 0, height - 1),
  };
};

const assertField = (
  value: unknown,
  path: string,
  width: number,
  height: number
): GardenerCell[][] => {
  if (!Array.isArray(value) || value.length !== height) {
    throw new Error(`${path} должно содержать ${height} строк`);
  }
  return value.map((row, y) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`${path}[${y}] должно содержать ${width} клеток`);
    }
    return row.map((cell, x) => {
      if (![-1, 0, 1, 2, 3].includes(cell as number)) {
        throw new Error(`${path}[${y}][${x}] содержит неизвестный тип клетки`);
      }
      return cell as GardenerCell;
    });
  });
};

const assertHiddenCells = (
  value: unknown,
  path: string,
  width: number,
  height: number,
  position: { x: number; y: number }
): boolean[][] => {
  if (!Array.isArray(value) || value.length !== height) {
    throw new Error(`${path} должно содержать ${height} строк`);
  }
  const hiddenCells = value.map((row, y) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`${path}[${y}] должно содержать ${width} клеток`);
    }
    return row.map((hidden, x) => {
      if (typeof hidden !== 'boolean') {
        throw new Error(`${path}[${y}][${x}] должно быть логическим значением`);
      }
      return hidden;
    });
  });
  if (hiddenCells[position.y][position.x]) {
    throw new Error(`${path} не может скрывать стартовую клетку`);
  }
  return hiddenCells;
};

const parseGardenerTest = (
  rawInput: unknown,
  rawChecks: unknown[],
  path: string
): Pick<VerificationTest, 'input' | 'checks'> => {
  const input = assertObject(rawInput, `${path}.input`);
  assertExactKeys(
    input,
    ['width', 'height', 'field', 'position', 'orientation'],
    [],
    `${path}.input`
  );
  const width = assertInteger(input.width, `${path}.input.width`, 1, 30);
  const height = assertInteger(input.height, `${path}.input.height`, 1, 30);
  const orientation = input.orientation;
  if (!['NORTH', 'EAST', 'SOUTH', 'WEST'].includes(orientation as string)) {
    throw new Error(`${path}.input.orientation содержит неизвестное направление`);
  }

  const checks = rawChecks.map((rawCheck, index): VerificationCheck => {
    const checkPath = `${path}.checks[${index}]`;
    const check = assertObject(rawCheck, checkPath);
    assertExactKeys(check, ['type', 'expected'], [], checkPath);
    if (check.type === 'gardener.field.equals') {
      return {
        type: check.type,
        expected: assertField(check.expected, `${checkPath}.expected`, width, height),
      };
    }
    if (check.type === 'gardener.position.equals') {
      return {
        type: check.type,
        expected: assertPosition(check.expected, `${checkPath}.expected`, width, height),
      };
    }
    throw new Error(`${checkPath}.type не поддерживается платформой junior-gardener`);
  });

  const field = assertField(input.field, `${path}.input.field`, width, height);
  const position = assertPosition(input.position, `${path}.input.position`, width, height);
  if (field[position.y][position.x] === -1) {
    throw new Error(`${path}.input.position не может быть стеной`);
  }
  return {
    input: { width, height, field, position, orientation: orientation as GardenerOrientation },
    checks,
  };
};

const parseReaderTest = (
  rawInput: unknown,
  rawChecks: unknown[],
  path: string
): Pick<VerificationTest, 'input' | 'checks'> => {
  const input = assertObject(rawInput, `${path}.input`);
  assertExactKeys(input, ['message'], [], `${path}.input`);
  if (typeof input.message !== 'string' || Array.from(input.message).length > 10_000) {
    throw new Error(`${path}.input.message должно содержать не более 10000 символов`);
  }
  const checks = rawChecks.map((rawCheck, index): VerificationCheck => {
    const checkPath = `${path}.checks[${index}]`;
    const check = assertObject(rawCheck, checkPath);
    assertExactKeys(check, ['type', 'expected'], [], checkPath);
    if (check.type !== 'reader.impulses.equals') {
      throw new Error(`${checkPath}.type не поддерживается платформой junior-reader`);
    }
    if (
      !Array.isArray(check.expected) ||
      check.expected.some((signal) => !['impulseA', 'impulseB', 'impulseC'].includes(signal))
    ) {
      throw new Error(`${checkPath}.expected содержит неизвестный импульс`);
    }
    return { type: check.type, expected: [...check.expected] } as ReaderImpulsesCheck;
  });
  return { input: { message: input.message }, checks };
};

const parseReaderGardenerTest = (
  rawInput: unknown,
  rawChecks: unknown[],
  path: string
): Pick<VerificationTest, 'input' | 'checks'> => {
  const input = assertObject(rawInput, `${path}.input`);
  assertExactKeys(input, ['reader', 'gardener'], [], `${path}.input`);
  const gardener = parseGardenerTest(input.gardener, [], path);
  const reader = parseReaderTest(input.reader, [], path);
  const checks = rawChecks.flatMap((rawCheck) => {
    const check = assertObject(rawCheck, `${path}.checks`);
    return check.type === 'reader.impulses.equals'
      ? parseReaderTest(input.reader, [check], path).checks
      : parseGardenerTest(input.gardener, [check], path).checks;
  });
  return {
    input: {
      reader: reader.input as ReaderTaskInput,
      gardener: gardener.input as GardenerTaskInput,
    },
    checks,
  };
};

const parseCyberBearTest = (
  rawInput: unknown,
  rawChecks: unknown[],
  path: string
): Pick<VerificationTest, 'input' | 'checks'> => {
  const input = assertObject(rawInput, `${path}.input`);
  assertExactKeys(input, ['durationMs', 'inputs'], ['random'], `${path}.input`);
  const durationMs = assertInteger(input.durationMs, `${path}.input.durationMs`, 1, 300_000);
  if (!Array.isArray(input.inputs) || input.inputs.length > 10_000)
    throw new Error('Ожидается не более 10000 входных байтов');
  const inputs = input.inputs.map((raw, index) => {
    const item = assertObject(raw, `${path}.input.inputs[${index}]`);
    assertExactKeys(item, ['channel', 'byte', 'timeMs'], [], `${path}.input.inputs[${index}]`);
    if (item.channel !== 'ir' && item.channel !== 'ears')
      throw new Error('Канал должен быть ir или ears');
    return {
      channel: item.channel as 'ir' | 'ears',
      byte: assertInteger(item.byte, 'byte', 0, 255),
      timeMs: assertInteger(item.timeMs, 'timeMs', 0, Number.MAX_SAFE_INTEGER),
    };
  });
  let random: CyberBearTaskInput['random'];
  if (input.random !== undefined) {
    const config = assertObject(input.random, 'random');
    assertExactKeys(config, [], ['seed', 'values', 'streams'], 'random');
    const values = (value: unknown): number[] => {
      if (!Array.isArray(value) || value.length > 10000)
        throw new Error('Random ожидает массив до 10000 чисел');
      return value.map((v) => assertInteger(v, 'random value', 0, 2 ** 32 - 1));
    };
    const streams =
      config.streams === undefined ? undefined : assertObject(config.streams, 'random.streams');
    if (streams && Object.keys(streams).length > 100)
      throw new Error('Слишком много потоков Random');
    random = {
      ...(config.seed === undefined
        ? {}
        : { seed: assertInteger(config.seed, 'random.seed', 0, 2 ** 32 - 1) }),
      ...(config.values === undefined ? {} : { values: values(config.values) }),
      ...(streams === undefined
        ? {}
        : {
            streams: Object.fromEntries(
              Object.entries(streams).map(([key, value]) => [key, values(value)])
            ),
          }),
    };
  }
  if (
    rawChecks.some(
      (raw) => !isObject(raw) || raw.type !== 'python' || Object.keys(raw).length !== 1
    )
  )
    throw new Error('КиберМишка проверяется модулем Python');
  return {
    input: { durationMs, inputs, ...(random ? { random } : {}) },
    checks: [{ type: 'python' }],
  };
};

export const parseProgrammingTask = (
  value: unknown,
  loadDescription?: (file: string) => string
): ProgrammingTask => {
  const task = assertObject(value, 'task');
  assertExactKeys(
    task,
    ['schemaVersion', 'id', 'version', 'title', 'summary', 'platformId', 'tests'],
    ['description', 'descriptionFile', 'codeWord', 'checker'],
    'task'
  );
  if (task.schemaVersion !== 1 && task.schemaVersion !== 2) {
    throw new Error(`schemaVersion ${String(task.schemaVersion)} не поддерживается`);
  }
  if ((task.description === undefined) === (task.descriptionFile === undefined)) {
    throw new Error('Укажите ровно одно поле: task.description или task.descriptionFile');
  }
  let description = task.description;
  if (task.descriptionFile !== undefined) {
    const file = assertString(task.descriptionFile, 'task.descriptionFile', 1000);
    if (!loadDescription) throw new Error('Для task.descriptionFile требуется загрузчик Markdown');
    description = loadDescription(file);
  }
  const parsedDescription = assertString(description, 'task.description', 100_000);
  if (
    !['junior-gardener', 'junior-reader', 'blg-mb-junior', 'reader-gardener'].includes(
      task.platformId as string
    )
  ) {
    throw new Error('task.platformId не поддерживается задачником');
  }
  if (!Array.isArray(task.tests) || task.tests.length === 0) {
    throw new Error('task.tests должен быть непустым массивом');
  }
  if (task.tests.length > MAX_TASK_TESTS) {
    throw new Error(`task.tests содержит больше ${MAX_TASK_TESTS} тестов`);
  }

  const platformId = task.platformId as TaskPlatformId;
  let checker: TaskChecker | undefined;
  if (platformId === 'blg-mb-junior') {
    if (task.schemaVersion !== 2) throw new Error('КиберМишке требуется schemaVersion 2');
    const value = assertObject(task.checker, 'task.checker');
    assertExactKeys(value, ['apiVersion'], ['file', 'source'], 'task.checker');
    if (value.apiVersion !== 1 || (value.file === undefined) === (value.source === undefined))
      throw new Error('Укажите apiVersion 1 и file или source проверяющего модуля');
    checker = {
      apiVersion: 1,
      ...(value.file === undefined
        ? { source: assertString(value.source, 'checker.source', 256000) }
        : { file: assertString(value.file, 'checker.file', 1000) }),
    };
  } else if (task.checker !== undefined)
    throw new Error('Python-чекер поддерживается для КиберМишки');
  const testIds = new Set<string>();
  let totalTimeout = 0;
  const tests = task.tests.map((rawTest, index): VerificationTest => {
    const path = `task.tests[${index}]`;
    const test = assertObject(rawTest, path);
    assertExactKeys(
      test,
      ['id', 'title', 'input', 'checks'],
      ['timeoutSeconds', 'hiddenCells', 'parameters', 'hideInputs'],
      path
    );
    const id = assertString(test.id, `${path}.id`, 128);
    if (testIds.has(id)) throw new Error(`${path}.id повторяет идентификатор ${id}`);
    testIds.add(id);
    if (!Array.isArray(test.checks) || test.checks.length === 0) {
      throw new Error(`${path}.checks должен быть непустым массивом`);
    }
    const timeoutSeconds =
      test.timeoutSeconds === undefined
        ? undefined
        : assertInteger(test.timeoutSeconds, `${path}.timeoutSeconds`, 1, 30);
    totalTimeout += timeoutSeconds ?? DEFAULT_TEST_TIMEOUT_SECONDS;
    const parsed =
      platformId === 'reader-gardener'
        ? parseReaderGardenerTest(test.input, test.checks, path)
        : platformId === 'blg-mb-junior'
        ? parseCyberBearTest(test.input, test.checks, path)
        : platformId === 'junior-gardener'
        ? parseGardenerTest(test.input, test.checks, path)
        : parseReaderTest(test.input, test.checks, path);
    if (platformId !== 'junior-gardener' && test.hiddenCells !== undefined) {
      throw new Error(`${path}.hiddenCells не поддерживается платформой junior-reader`);
    }
    const hiddenCells =
      test.hiddenCells === undefined
        ? undefined
        : assertHiddenCells(
            test.hiddenCells,
            `${path}.hiddenCells`,
            (parsed.input as GardenerTaskInput).width,
            (parsed.input as GardenerTaskInput).height,
            (parsed.input as GardenerTaskInput).position
          );
    if (test.hideInputs !== undefined && typeof test.hideInputs !== 'boolean')
      throw new Error('hideInputs должно быть логическим');
    return {
      id,
      ...(test.parameters === undefined
        ? {}
        : { parameters: assertObject(test.parameters, 'test.parameters') }),
      ...(test.hideInputs === undefined ? {} : { hideInputs: test.hideInputs }),
      title: assertString(test.title, `${path}.title`, 200),
      ...(timeoutSeconds === undefined ? {} : { timeoutSeconds }),
      ...parsed,
      ...(hiddenCells === undefined ? {} : { hiddenCells }),
    };
  });
  if (totalTimeout > MAX_TASK_TOTAL_TIMEOUT_SECONDS) {
    throw new Error(`суммарный timeout тестов превышает ${MAX_TASK_TOTAL_TIMEOUT_SECONDS} секунд`);
  }

  return {
    schemaVersion: task.schemaVersion as 1 | 2,
    ...(checker ? { checker } : {}),
    id: assertString(task.id, 'task.id', 128),
    version: assertInteger(task.version, 'task.version', 1, Number.MAX_SAFE_INTEGER),
    title: assertString(task.title, 'task.title', 200),
    summary: assertString(task.summary, 'task.summary', 1000),
    description: parsedDescription,
    ...(task.codeWord === undefined
      ? {}
      : { codeWord: assertString(task.codeWord, 'task.codeWord', 100) }),
    platformId,
    tests,
  };
};
