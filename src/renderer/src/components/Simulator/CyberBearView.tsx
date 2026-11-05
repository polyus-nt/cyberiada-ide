import React from 'react';

import { twMerge } from 'tailwind-merge';

import body from '@renderer/assets/cyberbear/body.svg';
import face from '@renderer/assets/cyberbear/face.svg';
import matrixLed from '@renderer/assets/cyberbear/matrix-led.svg';
import type { CyberBearState } from '@renderer/types/InterpreterTypes';

import { CYBERBEAR_EYES, MATRIX_COLUMNS, MATRIX_ROWS } from './cyberBearArtwork';
import { rgbkColor } from './cyberBearModel';

export const CyberBearView: React.FC<{ state: CyberBearState; className?: string }> = ({
  state,
  className,
}) => (
  <svg
    viewBox="0 0 253 381"
    className={twMerge('mx-auto block w-full max-w-[253px]', className)}
    role="img"
    aria-label="КиберМишка: глаза RGBK и матрица 5 на 7"
  >
    <image href={body} width="253" height="381" />
    {CYBERBEAR_EYES.map(({ side, glow, socket, pupil, highlight }) => {
      const [r, g, b, k] = state.eyes[side];
      const lit = r + g + b;
      const color = rgbkColor(state.eyes[side]);
      return (
        <g key={side} data-eye={side}>
          <title>
            {`${side === 'right' ? 'Правый глаз' : 'Левый глаз'}: ${state.eyes[side].join(', ')}`}
          </title>
          <path d={glow} fill={color} opacity={lit === 0 ? 0 : (0.15 * lit) / (lit + k)} />
          <path d={socket} fill="#DEF7FF" stroke="#173B49" strokeWidth="3.23494" />
          <path d={pupil} fill={color} />
          <path d={highlight} fill="white" />
        </g>
      );
    })}
    <image href={face} width="253" height="381" />
    {state.matrix.flatMap((row, y) =>
      row.map((brightness, x) => (
        <g key={`${x}:${y}`} data-led={`${y}:${x}`}>
          <title>{`Строка ${y + 1}, столбец ${x + 1}: ${brightness}%`}</title>
          {/* Only the light and its highlight fade; the socket belongs to body.svg. */}
          <image
            href={matrixLed}
            x={MATRIX_COLUMNS[x] - 7}
            y={MATRIX_ROWS[y] - 7}
            width="14"
            height="14"
            opacity={brightness / 100}
          />
        </g>
      ))
    )}
  </svg>
);
