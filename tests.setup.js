window.api = {};

window.electron = {
  ipcRenderer: {
    invoke() {
      return undefined;
    },
  },
};

// jsdom does not implement layout observation used by the shared ScrollArea.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
};
