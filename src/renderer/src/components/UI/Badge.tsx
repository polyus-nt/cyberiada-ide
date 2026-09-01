import React from 'react';

import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  show: boolean;
}

/**
 * Обёртка для отображения маркера (кружок основного цвета) в углу.
 */
export const Badge: React.FC<BadgeProps> = ({ children, show }) => {
  return (
    <div
      className={twMerge(
        "relative w-full after:absolute after:right-2 after:top-1/2 after:h-2 after:w-2 after:-translate-y-1/2 after:rounded-full after:bg-primary after:content-['']",
        !show && 'after:hidden'
      )}
    >
      {children}
    </div>
  );
};
