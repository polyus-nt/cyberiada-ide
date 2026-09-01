import { ButtonHTMLAttributes, HTMLAttributes, forwardRef } from 'react';

import { twMerge } from 'tailwind-merge';

export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'popover' | 'inline';
}

export const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ className, role = 'menu', variant = 'popover', ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={twMerge(variant === 'popover' && 'dropdown-menu', className)}
      {...props}
    />
  )
);

DropdownMenu.displayName = 'DropdownMenu';

export const DropdownMenuItem = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, role = 'menuitem', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    role={role}
    className={twMerge('dropdown-menu-item', className)}
    {...props}
  />
));

DropdownMenuItem.displayName = 'DropdownMenuItem';
