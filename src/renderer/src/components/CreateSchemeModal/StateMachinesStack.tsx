import { useLayoutEffect, useRef } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as DeleteIcon } from '@renderer/assets/icons/delete.svg';
import { ScrollArea } from '@renderer/components/UI';
import { Platform } from '@renderer/types/platform';
export type StateMachinesStackItem = {
  id: string;
  platform: Platform;
};
interface StateMachinesStackProps {
  selectedStateMachines: StateMachinesStackItem[];
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  isSelected: (index: number) => boolean;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}
export const StateMachinesStack: React.FC<StateMachinesStackProps> = ({
  selectedStateMachines,
  onDragStart,
  onDragEnd,
  isSelected,
  onSelect,
  onDelete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [selectedStateMachines]);

  const handleOnDelte = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, index: number) => {
    e.stopPropagation();
    onDelete(index);
  };

  return (
    <ScrollArea
      className="h-full w-full"
      viewportClassName="scroll-auto px-[7px] scrollbar-thumb-scrollbar-thumb"
      ref={containerRef}
    >
      {selectedStateMachines.map((sm, index) => {
        return (
          <div
            key={sm.id}
            className={twMerge(
              'group flex cursor-pointer select-none items-center rounded-lg px-3 py-1.5 transition-colors hover:bg-bg-hover',
              isSelected(index) && 'bg-bg-active'
            )}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragEnd={() => onDragEnd()}
            onClick={() => onSelect(index)}
          >
            <div className="min-w-0 leading-4">
              <div className="truncate">{sm.id}</div>
              <div className="truncate text-text-inactive">{sm.platform.name}</div>
            </div>
            <button
              type="button"
              aria-label={`Удалить ${sm.id}`}
              className="ml-auto rounded p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-bg-active focus:opacity-100"
              onClick={(e) => handleOnDelte(e, index)}
            >
              <DeleteIcon className="danger h-3 w-3" />
            </button>
          </div>
        );
      })}
    </ScrollArea>
  );
};
