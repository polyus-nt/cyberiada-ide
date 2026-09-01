import { useEffect, useRef, useState } from 'react';

import {
  NoteEdit,
  StateNameEdit,
  StateModal,
  TransitionModal,
  StateMachineNameEdit,
  DiagramTabs,
} from '@renderer/components';
import { useSettings } from '@renderer/hooks';
import { CanvasEditor } from '@renderer/lib/CanvasEditor';
import { CanvasController } from '@renderer/lib/data/ModelController/CanvasController';
import { EventSelection, State } from '@renderer/lib/drawable';
import { Point } from '@renderer/lib/types';
import { useModelContext } from '@renderer/store/ModelContext';
import { getColor } from '@renderer/theme';
import { Event } from '@renderer/types/diagram';

interface DiagramEditorProps {
  editor: CanvasEditor;
  controller: CanvasController;
}

export const DiagramEditor: React.FC<DiagramEditorProps> = (props: DiagramEditorProps) => {
  const editor = props.editor;
  const controller = props.controller;
  const [canvasSettings] = useSettings('canvas');
  const modelController = useModelContext();
  const stateMachines = Object.keys(controller.stateMachinesSub);
  const [smId, setSmId] = useState<string>(stateMachines[0]); // TODO(L140-beep): Как понять с какой именно МС мы работаем в данный момент?
  const isMounted = controller.useData('isMounted');
  const containerRef = useRef<HTMLDivElement>(null);

  const style = {
    backgroundColor: getColor('bg-primary'),
  };

  useEffect(() => {
    // Проверяем на идентификатор '', чтобы не совершать какие-либо операции
    // над "призрачным" канвасом, который нужен только при запуске приложения,
    // когда мы еще не редактируем какую-либо машину состояний.
    if (!containerRef.current || controller.id === '') return;
    editor.mount(containerRef.current);

    const handleDblclick = (position: Point) => {
      if (controller.type === 'scheme') return;
      modelController.createState({
        smId: smId,
        name: 'Состояние',
        events: [],
        dimensions: { width: 450, height: 100 },
        position,
        placeInCenter: true,
      });
    };

    const handleChangeEvent = (data: {
      state: State;
      eventSelection: EventSelection;
      event: Event;
      isEditingEvent: boolean;
    }) => {
      if (controller.type === 'scheme') return;
      // Let StateModal handle opening on changeEvent — only update current smId here
      setSmId(data.state.smId);
    };

    editor.view.on('dblclick', handleDblclick);
    editor.controller.states.on('changeEvent', handleChangeEvent);

    //! Не забывать удалять слушатели
    return () => {
      editor.view.off('dblclick', handleDblclick);
      editor.controller.states.off('changeEvent', handleChangeEvent);
      editor.unmount();
    };
    // FIXME: containerRef не влияет на перезапуск эффекта.
    // Скорее всего, контейнер меняться уже не будет, поэтому
    // реф закомментирован, но если что, https://stackoverflow.com/a/60476525.
    // }, [ containerRef.current ]);
  }, [editor]);

  useEffect(() => {
    if (!canvasSettings) return;
    editor.setSettings(canvasSettings);
  }, [canvasSettings, editor, controller.id]);

  return (
    <div className="relative h-full overflow-hidden">
      <div style={style} className="relative h-full overflow-hidden" ref={containerRef}></div>
      {isMounted && (
        <>
          <DiagramTabs />
          <StateNameEdit smId={smId} controller={controller} />
          <NoteEdit smId={smId} controller={controller} />
          <StateMachineNameEdit controller={controller} />
          {/* 
            Здесь находятся модалки, которые вызываются через взаимодействие с канвасом. 
            Модалки могут дублироваться по кодовой базе, если они вызываются другим способом.
          */}
          <StateModal smId={smId} controller={controller} />
          <TransitionModal controller={controller} smId={smId} />
          {/* <ActionsModal
            idx={actionsModalParentData?.eventSelection.actionIdx ?? null}
            controller={controller}
            smId={smId}
            initialData={actionsModalData}
            onSubmit={handleActionsModalSubmit}
            isOpen={isActionsModalOpen}
            onClose={closeActionsModal}
          /> */}
        </>
      )}
    </div>
  );
};
