import React from 'react';

import { twMerge } from 'tailwind-merge';

export type GardenerFieldCell = -1 | 0 | 1 | 2 | 3;
export type GardenerFieldOrientation =
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'NORTH'
  | 'EAST'
  | 'SOUTH'
  | 'WEST';

export const gardenerCellStyles: Record<GardenerFieldCell, string> = {
  [-1]: 'bg-[#333333]',
  0: 'bg-bg-primary',
  1: 'bg-[#e87373]',
  2: 'bg-[#78ed9d]',
  3: 'bg-[#65ced8]',
};

const orientationRotation: Record<Lowercase<GardenerFieldOrientation>, string> = {
  north: 'rotate-0',
  east: 'rotate-90',
  south: 'rotate-180',
  west: '-rotate-90',
};

interface GardenerMarkerProps {
  orientation: GardenerFieldOrientation;
  ariaLabel?: string;
}

export const GardenerMarker: React.FC<GardenerMarkerProps> = ({ orientation, ariaLabel }) => (
  <span
    aria-label={ariaLabel}
    className={twMerge(
      'absolute inset-0 flex items-center justify-center text-xl text-[#ffd600] transition-transform',
      orientationRotation[orientation.toLowerCase() as Lowercase<GardenerFieldOrientation>]
    )}
  >
    ▲
  </span>
);
