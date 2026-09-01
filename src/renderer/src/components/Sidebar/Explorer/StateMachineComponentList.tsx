import { useEffect, useMemo, useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as ArrowIcon } from '@renderer/assets/icons/arrow-down.svg';
import { ComponentAddModal } from '@renderer/components/ComponentAddModal';
import { ComponentDeleteModal } from '@renderer/components/ComponentDeleteModal';
import { ComponentEditModal } from '@renderer/components/ComponentEditModal';
import { AddButton } from '@renderer/components/UI/AddButton';
import { ScrollArea } from '@renderer/components/UI/ScrollArea';
import { useComponents } from '@renderer/hooks';
import { PlatformManager } from '@renderer/lib/data/PlatformManager';
import { useModelContext } from '@renderer/store/ModelContext';
import { Component as ComponentData } from '@renderer/types/diagram';

import { Component } from './Component';

export interface StateMachineComponentListProps {
  smId: string;
  isCollapsed: () => boolean;
  togglePanel: () => void;
}

export const StateMachineComponentList: React.FC<StateMachineComponentListProps> = ({
  smId,
  isCollapsed,
  togglePanel,
}) => {
  const modelController = useModelContext();
  const model = modelController.model;
  const components = model.useData(smId, 'elements.components') as {
    [id: string]: ComponentData;
  };
  const headControllerId = modelController.model.useData('', 'headControllerId');
  const controller = modelController.controllers[headControllerId];
  const platform = controller.useData('platform') as { [id: string]: PlatformManager };
  const isInitialized = modelController.model.useData('', 'isInitialized');

  const {
    addProps,
    editProps,
    deleteProps,
    onSwapComponents,
    onRequestAddComponent,
    onRequestEditComponent,
    onRequestDeleteComponent,
  } = useComponents(controller);

  const sortedComponents = useMemo(() => {
    return Object.entries(components)
      .sort((a, b) => a[1].order - b[1].order)
      .map((c) => c[0]);
  }, [components]);

  const [dragName, setDragName] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const onDropComponent = (name: string) => {
    if (!dragName) return;

    /* 
      Сюда приходят названия вида smId::componentId
      Но в модели данных компоненты хранятся как componentId
      Поэтому сплитим
    */
    const splittedDragName = dragName.split('::')[1];
    const splittedName = name.split('::')[1];
    onSwapComponents(smId, splittedDragName, splittedName);
  };

  const isDisabled = !isInitialized || headControllerId === '';

  useEffect(() => {
    if (isCollapsed()) togglePanel();
  }, [sortedComponents.length]);

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
          <h3 className="ml-1 text-xs font-medium">Компоненты</h3>
        </button>
        <AddButton disabled={isDisabled} onClick={() => onRequestAddComponent(smId, components)} />
      </div>
    );
  };

  return (
    <div key={smId} className="flex h-full flex-col">
      {header()}
      {isInitialized ? (
        <ScrollArea className="mb-2 flex-1" viewportClassName="select-none">
          {headControllerId === '' ? (
            <p className="text-text-inactive">
              <i>Нет активной диаграммы</i>
            </p>
          ) : sortedComponents.length === 0 ? (
            <p className="text-text-inactive">
              <i>Нет компонентов</i>
            </p>
          ) : (
            sortedComponents.map((id) => {
              const name = components[id].name;
              const key = controller.components.getComponentKey(smId, id);
              return (
                <Component
                  key={key}
                  name={name ?? id}
                  variant="compact"
                  description={
                    platform[smId] !== undefined
                      ? platform[smId].getComponent(id)?.description
                      : undefined
                  }
                  icon={
                    platform[smId] !== undefined
                      ? platform[smId].getFullComponentIcon(
                          id,
                          'size-[26px] [&>p]:bottom-0 [&>p]:right-0 [&>p]:text-[8px] [&>p]:leading-[9px]'
                        )
                      : undefined
                  }
                  isSelected={key === selectedComponent}
                  isDragging={key === dragName}
                  onCallContextMenu={() => onRequestEditComponent(smId, components, id)}
                  onSelect={() => setSelectedComponent(key)}
                  onEdit={() => onRequestEditComponent(smId, components, id)}
                  onDelete={() => onRequestDeleteComponent(smId, components, id)}
                  onDragStart={() => setDragName(key)}
                  onDrop={() => onDropComponent(key)}
                />
              );
            })
          )}
        </ScrollArea>
      ) : (
        <div className="px-4">Недоступно до открытия документа</div>
      )}

      <ComponentAddModal {...addProps} />
      <ComponentEditModal {...editProps} />
      <ComponentDeleteModal {...deleteProps} />
    </div>
  );
};
