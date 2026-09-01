import { create } from 'zustand';

import { ModelController } from '@renderer/lib/data/ModelController';
import { Tab } from '@renderer/types/tabs';

interface TabsState {
  items: Tab[];
  activeTab: string | null;
  setActiveTab: (tabName: string) => void;
  openTab: (modelController: ModelController, tab: Tab) => void;
  closeTab: (tabName: string, modelController: ModelController) => void;
  nextTab: (modelController: ModelController) => void;
  prevTab: (modelController: ModelController) => void;
}

export const useTabs = create<TabsState>((set) => ({
  items: [],
  activeTab: 'editor',
  setActiveTab: (activeTab) => {
    set(({ items }) => {
      const tab = items.find(({ name }) => name === activeTab);
      if (!tab) return {};
      return { activeTab };
    });
  },
  openTab: (_modelController, tab) =>
    set(({ items }) => {
      if (items.some(({ name }) => name === tab.name)) return { activeTab: tab.name };
      return { items: [...items, tab], activeTab: tab.name };
    }),
  closeTab: (tabName, _modelController) =>
    set(({ items, activeTab }) => {
      const closedTabIndex = items.findIndex(({ name }) => name === tabName);
      if (closedTabIndex === -1) return {};

      const newItems = items.filter(({ name }) => name !== tabName);
      if (activeTab !== tabName) return { items: newItems };

      const nextActiveIndex = Math.min(closedTabIndex, newItems.length - 1);
      return {
        items: newItems,
        activeTab: nextActiveIndex >= 0 ? newItems[nextActiveIndex].name : null,
      };
    }),
  nextTab: (_modelController) =>
    set(({ items, activeTab }) => {
      if (items.length === 0) return {};
      const activeIndex = items.findIndex(({ name }) => name === activeTab);
      const nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
      return { activeTab: items[nextIndex].name };
    }),
  prevTab: (_modelController) =>
    set(({ items, activeTab }) => {
      if (items.length === 0) return {};
      const activeIndex = items.findIndex(({ name }) => name === activeTab);
      const prevIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
      return { activeTab: items[prevIndex].name };
    }),
}));
