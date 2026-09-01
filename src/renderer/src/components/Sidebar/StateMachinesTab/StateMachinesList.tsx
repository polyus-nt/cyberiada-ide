import { useEffect } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as ArrowIcon } from '@renderer/assets/icons/arrow-down.svg';
import { ReactComponent as StateMachineIcon } from '@renderer/assets/icons/state_machine.svg';
import { StateMachineEditModal } from '@renderer/components/StateMachineEditModal';
import { AddButton } from '@renderer/components/UI/AddButton';
import { useStateMachines } from '@renderer/hooks';
import { getAvailablePlatforms } from '@renderer/lib/data/PlatformLoader';
import { useModelContext } from '@renderer/store/ModelContext';
import { StateMachine } from '@renderer/types/diagram';

import { StateMachineDeleteModal } from './StateMachineDeleteModal';

import { Component } from '../Explorer/Component';

interface StateMachinesListProps {
  selectedSm: string | null;
  setSmSelected: (newSmId: string | null) => void;
  isCollapsed: () => boolean;
  togglePanel: () => void;
}

export const StateMachinesList: React.FC<StateMachinesListProps> = ({
  selectedSm,
  setSmSelected,
  isCollapsed,
  togglePanel,
}) => {
  const modelController = useModelContext();

  const openStateMachine = (stateMachineId: string) => {
    const controllerEntry = Object.entries(modelController.controllers).find(
      ([, controller]) =>
        controller.type === 'specific' && controller.stateMachinesSub[stateMachineId] !== undefined
    );

    if (!controllerEntry) return;

    const [controllerId] = controllerEntry;
    modelController.changeHeadControllerId(controllerId);
  };

  const isInitialized = modelController.model.useData('', 'isInitialized');
  const elements = modelController.model.useData('', 'elements.stateMachinesId') as {
    [ID: string]: StateMachine;
  };

  const {
    addProps,
    editProps,
    deleteProps,
    // onSwapStateMachines
    // onRequestDeleteStateMachine,
    onRequestAddStateMachine,
    onRequestEditStateMachine,
    isDuplicateName,
    onDuplicateStateMachine,
  } = useStateMachines();

  const platformList = getAvailablePlatforms().map((platform) => {
    return { value: platform.idx, label: platform.name };
  });

  const isDisabled = !isInitialized;

  useEffect(() => {
    if (isCollapsed()) togglePanel();
  }, [elements]);

  const header = () => {
    return (
      <div className="flex h-11 items-center">
        <button className="flex items-center" onClick={() => togglePanel()}>
          <ArrowIcon
            className={twMerge(
              'size-3 rotate-0 transition-transform',
              isCollapsed() && '-rotate-90'
            )}
          />
          <h3 className="ml-1 text-xs font-medium">Машины состояний</h3>
        </button>
        <AddButton disabled={isDisabled} onClick={onRequestAddStateMachine} />
      </div>
    );
  };
  // TODO (L140-beep): Необходимо доделать
  return (
    <section className="flex h-full flex-col">
      {header()}
      {isInitialized ? (
        <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
          {Object.keys(elements).length === 1 ? (
            <p className="text-text-inactive">
              <i>Нет машин состояний</i>
            </p>
          ) : (
            [...Object.entries(elements)].map(
              ([id, sm]) =>
                id !== '' && (
                  <Component
                    key={id}
                    name={sm.name || id}
                    isSelected={id === selectedSm}
                    icon={
                      <StateMachineIcon
                        className={twMerge(
                          'size-6 [&_*]:stroke-[#6b6b6b]',
                          id === selectedSm && '[&_*]:stroke-icon-hover'
                        )}
                      />
                    }
                    onSelect={() => setSmSelected(id)}
                    onEdit={() => openStateMachine(id)}
                    onDelete={() => undefined}
                    onCallContextMenu={() => onRequestEditStateMachine(id)}
                    // TODO (L140-beep): Доделать свап машин состояний
                    onDragStart={() => console.log('setDragState')}
                    onDrop={() => console.log('onDrop')}
                    isDragging={id === ''}
                  />
                )
            )
          )}
        </div>
      ) : (
        <div className="px-4">Недоступно до открытия документа</div>
      )}

      <StateMachineEditModal
        variant="edit"
        form={editProps.editForm}
        isOpen={editProps.isOpen}
        onClose={editProps.onClose}
        onSubmit={editProps.onEdit}
        submitLabel="Применить"
        onSide={editProps.onDelete}
        sideLabel="Удалить"
        platformList={platformList}
        isDuplicateName={isDuplicateName}
        selectPlatformDisabled={true}
        duplicateStateMachine={onDuplicateStateMachine}
      />
      <StateMachineEditModal
        variant="create"
        form={addProps.addForm}
        isOpen={addProps.isOpen}
        onClose={addProps.onClose}
        onSubmit={addProps.onSubmit}
        submitLabel="Добавить"
        onSide={undefined}
        sideLabel={undefined}
        platformList={platformList}
        isDuplicateName={isDuplicateName}
        selectPlatformDisabled={false}
      />
      <StateMachineDeleteModal {...{ ...deleteProps, idx: selectedSm ?? undefined }} />
    </section>
  );
};
