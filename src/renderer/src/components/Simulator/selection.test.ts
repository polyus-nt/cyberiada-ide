import { describe, expect, it } from 'vitest';

import { emptyStateMachine } from '@renderer/types/diagram';

import {
  getSimulationMachineOptions,
  isSimulationResultStale,
  selectInitialMachineId,
} from './selection';

const machine = (platform: string, name: string) => ({
  ...emptyStateMachine(),
  platform,
  name,
});

describe('simulator state machine selection', () => {
  const options = getSimulationMachineOptions({
    '': machine('', 'scheme screen'),
    arduino: machine('arduino-uno', 'Arduino'),
    reader: machine('junior-reader', 'Reader'),
    gardener: machine('junior-gardener', 'Gardener'),
  });

  it('includes only supported state machines', () => {
    expect(options.map(({ id }) => id)).toEqual(['reader', 'gardener']);
  });

  it('prefers the supported active state machine', () => {
    expect(selectInitialMachineId(options, 'gardener')).toBe('gardener');
  });

  it('falls back to the first supported state machine', () => {
    expect(selectInitialMachineId(options, 'arduino')).toBe('reader');
    expect(selectInitialMachineId([], 'reader')).toBeUndefined();
  });

  it('marks only a changed completed result as stale', () => {
    expect(isSimulationResultStale(true, '<old/>', '<new/>')).toBe(true);
    expect(isSimulationResultStale(true, '<same/>', '<same/>')).toBe(false);
    expect(isSimulationResultStale(false, '<old/>', '<new/>')).toBe(false);
  });
});
