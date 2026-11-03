import React from 'react';

import type { CyberBearState } from '@renderer/types/InterpreterTypes';

import { rgbkColor } from './cyberBearModel';

export const CyberBearView: React.FC<{ state: CyberBearState }> = ({ state }) => (
  <svg
    viewBox="0 0 320 440"
    className="mx-auto max-h-[490px] w-full max-w-[360px]"
    role="img"
    aria-label="КиберМишка: глаза RGBK и матрица 5 на 7"
  >
    <path
      d="M97 44 C81 9 38 18 40 49 C41 68 52 78 71 78 C62 112 77 146 106 166 L98 180 Q88 186 78 159 L62 132 C48 100 8 108 8 134 Q8 150 20 168 L54 213 Q66 228 82 233 L82 311 L66 391 C61 421 93 434 111 410 L145 354 L175 354 L209 410 C227 434 259 421 254 391 L238 311 L238 233 Q254 228 266 213 L300 168 Q312 150 312 134 C312 108 272 100 258 132 L242 159 Q232 186 222 180 L214 166 C243 146 258 112 249 78 C268 78 279 68 280 49 C282 18 239 9 223 44 C194 9 126 9 97 44 Z"
      fill="var(--color-bg-primary, #f5f5f4)"
      stroke="#a8a29e"
      strokeWidth="2"
    />
    <g fill="#44403c">
      <circle cx="66" cy="49" r="12" />
      <circle cx="254" cy="49" r="12" />
      <path d="M149 109 Q160 100 171 109 L169 120 L151 120 Z" />
    </g>
    <path
      d="M160 119 V132 Q144 146 133 132 M160 132 Q176 146 187 132"
      fill="none"
      stroke="#44403c"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {(['right', 'left'] as const).map((side, index) => (
      <g key={side}>
        <title>
          {`${side === 'right' ? 'Правый глаз' : 'Левый глаз'}: ${state.eyes[side].join(', ')}`}
        </title>
        <circle
          cx={index === 0 ? 119 : 201}
          cy="88"
          r="17"
          fill={rgbkColor(state.eyes[side])}
          opacity="0.16"
        />
        <circle
          cx={index === 0 ? 119 : 201}
          cy="88"
          r="8"
          fill={rgbkColor(state.eyes[side])}
          stroke="#78716c"
        />
      </g>
    ))}
    {state.matrix.flatMap((row, y) =>
      row.map((brightness, x) => (
        <g key={`${x}:${y}`}>
          <title>{`Строка ${y + 1}, столбец ${x + 1}: ${brightness}%`}</title>
          <circle cx={120 + x * 20} cy={210 + y * 20} r="6" fill="#44403c" />
          <circle
            cx={120 + x * 20}
            cy={210 + y * 20}
            r="6"
            fill="#fef08a"
            opacity={brightness / 100}
          />
        </g>
      ))
    )}
  </svg>
);
