import { beforeEach, describe, expect, it } from 'vitest';

import { useWindowManagerStore } from './useWindowManagerStore';

describe('window manager', () => {
  beforeEach(() => {
    useWindowManagerStore.getState().closeAllWindows();
  });

  it('closes Diagram Editor windows before changing the primary workspace', () => {
    useWindowManagerStore.setState({
      windows: [
        {
          id: 'state-editor',
          type: 'state',
          position: { x: 10, y: 20 },
          size: { width: 600, height: 400 },
          zIndex: 3,
        },
      ],
      activeWindowId: 'state-editor',
      previousWindowId: 'transition-editor',
      windowHistory: ['transition-editor'],
      selectedWindowIndex: 1,
      isSplitterVisible: true,
    });

    useWindowManagerStore.getState().closeAllWindows();

    expect(useWindowManagerStore.getState()).toMatchObject({
      windows: [],
      activeWindowId: null,
      previousWindowId: null,
      windowHistory: [],
      selectedWindowIndex: 0,
      isSplitterVisible: false,
    });
  });
});
