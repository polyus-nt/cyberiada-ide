import React from 'react';

import { twMerge } from 'tailwind-merge';

import { FileMenuItem, FileMenuItemId } from '@renderer/hooks/useFileMenu';

import { Badge, DropdownMenu, DropdownMenuItem, WithHint } from '../../UI';

const compactMenuItemIds = new Set<FileMenuItemId>([
  'new',
  'open',
  'open-recent',
  'save',
  'save-as',
  'import',
  'properties',
]);

interface MenuDropdownProps {
  items: FileMenuItem[];
  variant?: 'popover' | 'start-screen';
  onItemSelect?: () => void;
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  items,
  variant = 'popover',
  onItemSelect,
}) => {
  const isCompact = variant === 'popover' || variant === 'start-screen';

  return (
    <DropdownMenu variant={variant === 'popover' ? 'popover' : 'inline'} className="flex flex-col">
      {items.map(
        ({ id, text, onClick, disabled = false, hidden = false, className, badge, hint }) => {
          const isHidden = hidden || (isCompact && !compactMenuItemIds.has(id));
          const button = (
            <DropdownMenuItem
              key={id}
              className={twMerge(
                isCompact
                  ? 'h-[25px] py-0 leading-none enabled:hover:bg-[#e4f2ff]'
                  : 'px-2 py-2 indent-4 text-base enabled:hover:bg-bg-hover',
                className
              )}
              onClick={() => {
                onClick();
                onItemSelect?.();
              }}
              disabled={disabled}
              hidden={isHidden}
            >
              <Badge show={badge ?? false}>{text}</Badge>
            </DropdownMenuItem>
          );

          return hint ? (
            <WithHint key={id} hint={hint}>
              {(hintProps) => React.cloneElement(button, hintProps)}
            </WithHint>
          ) : (
            button
          );
        }
      )}
    </DropdownMenu>
  );
};
