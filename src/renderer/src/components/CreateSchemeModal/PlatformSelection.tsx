import React, { useMemo, useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { getAvailablePlatforms, getPlatform } from '@renderer/lib/data/PlatformLoader';
import { Platform } from '@renderer/types/platform';

import { StateMachinesStack, StateMachinesStackItem } from './StateMachinesStack';

import { ScrollArea } from '../UI';

interface PlatformSelectionProps {
  selectedPlatformIdx: string | null;
  setSelectedPlatformIdx: (value: string | null) => void;
  selectedStateMachineIndex: number | null;
  setSelectedStateMachineIndex: (value: number | null) => void;
  selectedStateMachines: StateMachinesStackItem[];
  onAddPlatform: (platform: Platform) => void;
  onDeletePlatform: (index: number) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  selectedStateMachines,
  selectedPlatformIdx,
  setSelectedPlatformIdx,
  selectedStateMachineIndex,
  setSelectedStateMachineIndex,
  onAddPlatform,
  onDeletePlatform,
}) => {
  const handleClickPlatform = (idx: string) => {
    setSelectedPlatformIdx(idx);
    setSelectedStateMachineIndex(null);
  };
  const handleClickStateMachine = (index: number) => {
    setSelectedPlatformIdx(null);
    setSelectedStateMachineIndex(index);
  };

  const isPlatformSelected = (idx: string) => selectedPlatformIdx === idx;

  const isStateMachineSelected = (index: number) => selectedStateMachineIndex === index;

  const [draggedPlatformIdx, setDraggedPlatformIdx] = useState<string | null>(null);

  const [draggedStateMachineIndex, setDraggedStateMachineIndex] = useState<number | null>(null);

  const platforms = getAvailablePlatforms();
  const selectedPlatform = useMemo(() => {
    if (selectedPlatformIdx !== null) {
      return getPlatform(selectedPlatformIdx);
    }
    if (selectedStateMachineIndex !== null) {
      return selectedStateMachines[selectedStateMachineIndex].platform;
    }
    return null;
  }, [selectedPlatformIdx, selectedStateMachineIndex, selectedStateMachines]);

  const handleAddPlatform = (platformIdx: string) => {
    const platform = getPlatform(platformIdx);
    if (platform === undefined) return;
    onAddPlatform(platform);
  };

  const handleDropPlatformOnStateMachines = () => {
    if (draggedPlatformIdx === null) return;
    handleAddPlatform(draggedPlatformIdx);
    setDraggedPlatformIdx(null);
  };

  const handleOnDeletePlatform = (index: number) => {
    if (selectedStateMachineIndex === index) {
      setSelectedStateMachineIndex(null);
    }
    onDeletePlatform(index);
  };

  const handleDropStateMachineOnPlatforms = () => {
    // console.log(draggedStateMachineIndex);
    if (draggedStateMachineIndex === null) return;
    handleOnDeletePlatform(draggedStateMachineIndex);
    setDraggedStateMachineIndex(null);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-6 gap-y-[22px]">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => handleDropPlatformOnStateMachines()}
      >
        <h2 className="mb-[11px] font-medium">Выбрано</h2>
        <div className="h-[220px] rounded-lg border border-border-primary bg-bg-control">
          {selectedStateMachines.length > 0 ? (
            <StateMachinesStack
              selectedStateMachines={selectedStateMachines}
              onDragStart={(index) => setDraggedStateMachineIndex(index)}
              onDragEnd={() => setDraggedStateMachineIndex(null)}
              isSelected={isStateMachineSelected}
              onSelect={handleClickStateMachine}
              onDelete={handleOnDeletePlatform}
            />
          ) : (
            <div className="p-2 leading-[15px] text-text-inactive">
              <p>
                Чтобы добавить платформу для документа, выберите её из списка справа и перетащите её
                сюда, либо дважды нажмите на неё левой кнопкой мыши.
              </p>
              <p className="mt-7">
                Чтобы убрать платформу из этого списка, нажмите на корзину, которая появится
                напротив неё, либо перетащите её обратно.
              </p>
            </div>
          )}
        </div>
      </div>
      <div>
        <h2 className="mb-[11px] font-medium">Платформы</h2>
        <ScrollArea
          className="h-[220px] w-full rounded-lg border border-border-primary bg-bg-control"
          viewportClassName="px-[7px] scrollbar-thumb-scrollbar-thumb"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDropStateMachineOnPlatforms()}
        >
          {platforms.map(({ idx, name }) => (
            <div
              key={idx}
              className={twMerge(
                'flex cursor-pointer select-none items-center rounded-lg px-3 py-[5px] leading-4 transition-colors hover:bg-bg-hover',
                isPlatformSelected(idx) && 'bg-bg-active'
              )}
              onDoubleClick={() => handleAddPlatform(idx)}
              onClick={() => handleClickPlatform(idx)}
              draggable
              onDragStart={() => setDraggedPlatformIdx(idx)}
              onDragEnd={() => setDraggedPlatformIdx(null)}
            >
              {name}
            </div>
          ))}
        </ScrollArea>
      </div>
      <div className="col-span-2">
        <h2 className="mb-[11px] font-medium">Описание</h2>
        <ScrollArea
          className={twMerge(
            'h-[60px] w-full',
            !selectedPlatform?.description && 'text-text-inactive'
          )}
          viewportClassName="whitespace-pre-wrap leading-4 scrollbar-thumb-scrollbar-thumb"
        >
          {selectedPlatform?.description ||
            'Выберите платформу из одного из списков сверху, чтобы посмотреть описание платформы.'}
        </ScrollArea>
      </div>
    </div>
  );
};
