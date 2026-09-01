// TODO (L140-beep) Что делаем с этими вкладками?

import React from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as CodeIcon } from '@renderer/assets/icons/code.svg';
import { ReactComponent as FlasherIcon } from '@renderer/assets/icons/flasher.svg';
import { ReactComponent as MonitorIcon } from '@renderer/assets/icons/serial_monitor.svg';
import { ReactComponent as StateIcon } from '@renderer/assets/icons/state.svg';
import { ReactComponent as EditorIcon } from '@renderer/assets/icons/state_machine.svg';
import { ReactComponent as TransitionIcon } from '@renderer/assets/icons/transition.svg';
import { Tab as TabType } from '@renderer/types/tabs';

interface TabProps {
  isActive: boolean;
  type: TabType['type'];
  onMouseDown: () => void;
}

export const Tab: React.FC<TabProps> = (props) => {
  const { isActive, type, onMouseDown } = props;

  const TabIcon = {
    editor: <EditorIcon className="text-[#737373]" width={25} height={25} />,
    code: <CodeIcon className="text-[#737373]" width={25} height={25} />,
    transition: <TransitionIcon className="text-[#737373]" width={25} height={25} />,
    state: <StateIcon className="text-[#737373]" width={20} height={20} />, // текущая иконка слишком большая, поэтому размеры указаны поменьше
    serialMonitor: <MonitorIcon className="text-[#737373]" width={25} height={25} />,
    managerMS: <FlasherIcon className="text-[#737373]" width={25} height={25} />,
  };

  return (
    <div
      className={twMerge(
        'group flex cursor-pointer items-center rounded p-1 px-2 transition hover:bg-bg-primary',
        isActive && 'bg-bg-primary'
      )}
      onMouseDown={onMouseDown}
    >
      {TabIcon[type]}
    </div>
  );
};
