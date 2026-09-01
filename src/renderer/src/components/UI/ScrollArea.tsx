import { forwardRef, HTMLAttributes } from 'react';

import { twMerge } from 'tailwind-merge';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string;
}

/**
 * Keeps the native scrollbar inset from the container edges while forwarding
 * the ref to the actual scrolling viewport.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, viewportClassName, ...props }, ref) => (
    <div
      {...props}
      className={twMerge('flex min-h-0 min-w-0 flex-col overflow-hidden py-[5px]', className)}
    >
      <div
        ref={ref}
        className={twMerge('mr-[6px] min-h-0 flex-1 overflow-auto', viewportClassName)}
      >
        {children}
      </div>
    </div>
  )
);

ScrollArea.displayName = 'ScrollArea';
