// TODO (L140-beep) Что делаем с этими вкладками?

import { twMerge } from 'tailwind-merge';

import { CodeEditor } from '@renderer/components';
import { FlasherTab } from '@renderer/components/Sidebar/Flasher/Flasher';
import { SerialMonitorTab } from '@renderer/components/Sidebar/Flasher/SerialMonitor';
import { useModelContext } from '@renderer/store/ModelContext';
import { useTabs } from '@renderer/store/useTabs';
import { Tab as TabType } from '@renderer/types/tabs';

import { Tab } from './Tab';

import { NotInitialized } from '../NotInitialized';

export const Tabs: React.FC = () => {
  const modelController = useModelContext();
  const [items, activeTab, setActiveTab] = useTabs((state) => [
    state.items,
    state.activeTab,
    state.setActiveTab,
  ]);

  if (modelController.isNotInitialized()) {
    return (
      <div className="flex h-full w-full flex-row items-center justify-center overflow-auto align-middle scrollbar-thin scrollbar-track-transparent scrollbar-thumb-current">
        <NotInitialized />
      </div>
    );
  }

  const selectTab = (item: TabType) => {
    switch (item.type) {
      case 'transition':
      case 'state':
      case 'code':
        return <CodeEditor initialValue={item.code} language={item.language} />;
      case 'serialMonitor':
        return <SerialMonitorTab isTabOpen={item.isOpen} />;
      case 'managerMS':
        return <FlasherTab />;
      default:
        return undefined;
    }
  };

  return (
    <>
      <section
        className="flex gap-1 overflow-x-auto break-words border-b border-border-primary bg-bg-secondary px-1 py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-current"
        tabIndex={-1}
      >
        {items.map((tab) => (
          <Tab
            key={tab.name}
            isActive={activeTab === tab.name}
            type={tab.type}
            onMouseDown={() => {
              setActiveTab(tab.name);
            }}
          />
        ))}
      </section>

      {items.map((item) => (
        <div
          key={item.name}
          className={twMerge('hidden h-[calc(100vh-44.19px)]', activeTab === item.name && 'block')}
        >
          {selectTab(item)}
        </div>
      ))}
    </>
  );
};
