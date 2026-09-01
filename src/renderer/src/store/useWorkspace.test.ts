import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkspace } from './useWorkspace';

describe('useWorkspace', () => {
  beforeEach(() => {
    useWorkspace.setState({ activeWorkspace: 'editor' });
  });

  it('switches the primary workspace', () => {
    useWorkspace.getState().setActiveWorkspace('simulator');
    expect(useWorkspace.getState().activeWorkspace).toBe('simulator');
  });
});
