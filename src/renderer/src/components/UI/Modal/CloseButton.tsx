import { ButtonHTMLAttributes } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as Close } from '@renderer/assets/icons/close.svg';

interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  iconClassName?: string;
}

export const CloseButton: React.FC<CloseButtonProps> = ({ className, iconClassName, ...props }) => (
  <button
    type="button"
    className={twMerge(
      'rounded-full p-1 transition-colors hover:bg-bg-hover active:bg-bg-active',
      className
    )}
    {...props}
  >
    <Close className={twMerge('h-3 w-3 fill-black text-black', iconClassName)} />
  </button>
);
