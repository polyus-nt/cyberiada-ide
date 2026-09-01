import React from 'react';

import * as RSwitch from '@radix-ui/react-switch';
import { twMerge } from 'tailwind-merge';

export const Switch: React.FC<RSwitch.SwitchProps> = (props) => {
  const { className, ...other } = props;
  return (
    <RSwitch.Root
      className={twMerge(
        'relative h-[18px] w-[30px] cursor-pointer rounded-full bg-switch-inactive-bg outline-none data-[state=checked]:bg-icon-selected-bg',
        className && className
      )}
      style={{ WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)' }}
      {...other}
    >
      <RSwitch.Thumb className="block size-[14px] translate-x-0.5 rounded-full bg-text-inactive bg-white transition duration-100 will-change-transform data-[state=checked]:translate-x-[15px]" />
    </RSwitch.Root>
  );
};
