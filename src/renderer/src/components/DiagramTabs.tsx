import { useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as ConnectionStatus } from '@renderer/assets/icons/circle.svg';
import { ReactComponent as CompilerIcon } from '@renderer/assets/icons/compiler.svg';
import { ReactComponent as FlasherIcon } from '@renderer/assets/icons/flasher.svg';
import { ReactComponent as SerialMonitorIcon } from '@renderer/assets/icons/serial_monitor.svg';
import { ReactComponent as EditorIcon } from '@renderer/assets/icons/state_machine.svg';
import { CompilerTab } from '@renderer/components/Sidebar/Compiler';
import { FlasherStatus, FlasherTab } from '@renderer/components/Sidebar/Flasher/Flasher';
import {
  SerialMonitorStatus,
  SerialMonitorTab,
} from '@renderer/components/Sidebar/Flasher/SerialMonitor';
import { MovingModal } from '@renderer/components/UI/Modal/MovingModal';
import { WithHint } from '@renderer/components/UI/WithHint';
import { useManagerMS } from '@renderer/store/useManagerMS';

import { CompilerStatus } from './Modules/Websocket/ClientStatus';

const humanizeCompilerResult = (status?: string): string => {
  if (!status) return 'Нет данных';
  switch (status) {
    case 'OK':
      return 'Готово';
    case 'NOTOK':
      return 'Проблема!';
    default:
      return status;
  }
};

const tabs = {
  editor: {
    title: 'Редактор',
    Icon: <EditorIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: '',
    modalTitle: undefined,
  },
  compiler: {
    title: 'Компилятор',
    Icon: <CompilerIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: 'h-[406px] max-h-[calc(100vh-24px)] w-[1074px] max-w-[calc(100vw-24px)]',
    modalTitle: undefined,
  },
  flasher: {
    title: 'Загрузчик',
    Icon: <FlasherIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: 'h-[644px] max-h-[calc(100vh-24px)] w-[1074px] max-w-[calc(100vw-24px)]',
    modalTitle: (
      <div className="flex items-center gap-12">
        <span>Загрузчик</span>
        <FlasherStatus />
      </div>
    ),
  },
  serialMonitor: {
    title: 'Монитор порта',
    modalTitle: (
      <div className="flex items-center gap-12">
        <span>Монитор порта</span>
        <SerialMonitorStatus />
      </div>
    ),
    Icon: <SerialMonitorIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: 'h-[740px] max-h-[calc(100vh-24px)] w-[1074px] max-w-[calc(100vw-24px)]',
  },
};

type TabName = keyof typeof tabs;

export const DiagramTabs = () => {
  const [activeTab, setActiveTab] = useState<TabName>('editor');
  const { compilerData, compilerStatus } = useManagerMS();

  const renderTab = () => {
    switch (activeTab) {
      case 'compiler':
        return <CompilerTab />;
      case 'flasher':
        return <FlasherTab />;
      case 'serialMonitor':
        return <SerialMonitorTab isTabOpen showStatus={false} />;
      default:
        return null;
    }
  };

  const tab = activeTab === 'editor' ? null : tabs[activeTab];
  const modalTitle =
    activeTab === 'compiler' ? (
      <div className="flex items-center gap-2">
        <span>Компилятор</span>
        <ConnectionStatus
          className={twMerge(
            'ml-1 fill-text-inactive',
            (compilerStatus === CompilerStatus.NO_CONNECTION ||
              compilerStatus === CompilerStatus.CONNECTION_ERROR) &&
              'fill-error',
            compilerStatus === CompilerStatus.CONNECTED && 'fill-success'
          )}
          width="8px"
          height="8px"
        />
        <span className="ml-10 font-normal">Статус:</span>
        <span
          className={twMerge(
            'font-normal text-primary',
            compilerData?.result === 'NOTOK' && 'text-error'
          )}
        >
          {humanizeCompilerResult(compilerData?.result)}
        </span>
      </div>
    ) : (
      tab?.modalTitle ?? tab?.title
    );

  return (
    <>
      <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 gap-[14px] rounded-lg bg-white px-2 py-1.5 shadow-[0_0_10.6px_rgba(0,0,0,0.15)]">
        {(Object.entries(tabs) as [TabName, (typeof tabs)[TabName]][]).map(
          ([name, { title, Icon }]) => (
            <WithHint key={name} hint={title} placement="bottom" offset={6} delay={100}>
              {(hintProps) => (
                <button
                  type="button"
                  className={`rounded p-1 text-icon-secondary transition-colors hover:text-icon-hover ${
                    activeTab === name ? 'bg-icon-selected-bg text-white [&_*]:stroke-white' : ''
                  }`}
                  aria-label={title}
                  onClick={() => setActiveTab(name)}
                  {...hintProps}
                >
                  {Icon}
                </button>
              )}
            </WithHint>
          )
        )}
      </div>

      {tab && (
        <MovingModal
          key={activeTab}
          id={activeTab}
          title={modalTitle}
          isOpen
          onRequestClose={() => setActiveTab('editor')}
          hideCancelButton
          className={tab.className}
        >
          <div className="h-full overflow-auto">{renderTab()}</div>
        </MovingModal>
      )}
    </>
  );
};
