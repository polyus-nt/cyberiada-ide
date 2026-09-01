import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import CodeMirror, { Transaction, EditorState, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import throttle from 'lodash.throttle';

import { ReactComponent as AddIcon } from '@renderer/assets/icons/add.svg';
import { TabPanel, Tabs } from '@renderer/components/UI';
import { AddButton } from '@renderer/components/UI/AddButton';
import { EventData } from '@renderer/types/diagram';

import { Action } from './Action';

import { useActions } from '../hooks';

type ActionsProps = ReturnType<typeof useActions> & {
  event: EventData | null | undefined;
  disabled?: boolean;
};

/**
 * Блок действия в модалках редактирования нод
 */
export const Actions: React.FC<ActionsProps> = (props) => {
  const {
    tabValue,
    onTabChange,
    actions,
    onAddAction,
    onChangeAction,
    onDeleteAction,
    onReorderAction,
    smId,
    controller,
    text,
    onChangeText,
    getComponentName,
    setActions,
    event,
    parse,
    disabled,
  } = props;
  const visual = controller.useData('visual');

  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);

  const handleTabChange = (tab: number) => {
    onTabChange(tab);

    // Фокусировка и установка каретки
    if (tab === 1) {
      setTimeout(() => {
        const view = editorRef?.current?.view;
        if (!view) return;

        view.focus();
        view.dispatch({
          selection: {
            anchor: view.state.doc.length,
            head: view.state.doc.length,
          },
        });
      }, 0);
    }
  };

  const handleLengthLimit = (tr: Transaction) => {
    return tr.newDoc.lines <= 10;

    // return tr.startState.doc.length + tr.newDoc.length < 200;
  };

  useLayoutEffect(() => {
    event && parse(smId, event.do);
    // setActions(event && typeof event.do !== 'string' ? event.do : []);
  }, [event, setActions]);

  const handleChangeText = useMemo(() => throttle(onChangeText, 500), [onChangeText]);

  const handleDrag = (index: number) => setDragIndex(index);

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;

    onReorderAction(dragIndex, index);
  };

  const handleClickDelete = (idx: number) => {
    if (idx === null) return;

    onDeleteAction(idx);
  };

  return (
    <div className="flex h-full min-h-44 flex-1 flex-col">
      <div className="mb-2 flex items-end gap-2">
        <p className="font-medium">Делай</p>

        {!visual && (
          <Tabs
            className="ml-auto"
            tabs={['Выбор', 'Код']}
            value={tabValue}
            onChange={handleTabChange}
          />
        )}
        <AddButton onClick={onAddAction} disabled={disabled} />
      </div>

      <div className="h-full min-h-0 flex-1">
        <TabPanel value={0} tabValue={tabValue} className="h-full">
          <div
            onDoubleClick={disabled ? undefined : onAddAction}
            className="flex h-full min-h-0  flex-1 gap-2"
          >
            <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-x-auto overflow-y-auto whitespace-nowrap rounded-lg border border-border-primary scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
              {actions.length === 0 && (
                <div className="flex h-full w-full select-none flex-row items-center justify-center text-center align-middle text-text-inactive">
                  <span className="mr-2">Чтобы добавить действие, нажмите</span>
                  <div>
                    <AddIcon className="btn-secondary h-5 w-5 min-w-0 cursor-default rounded border border-text-inactive p-[0.5px] enabled:hover:opacity-80 enabled:active:opacity-60" />
                  </div>
                </div>
              )}
              <div className="min-w-full">
                {actions.map((data, i) => (
                  <Action
                    key={i}
                    smId={smId}
                    isSelected={selectedActionIndex === i}
                    onSelect={() => setSelectedActionIndex(i)}
                    onChange={() => !disabled && onChangeAction(data)}
                    onDelete={() => handleClickDelete(i)}
                    onDragStart={() => handleDrag(i)}
                    onDrop={() => handleDrop(i)}
                    data={{
                      ...data,
                      componentName: getComponentName(data.component) ?? data.component,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </TabPanel>

        {!visual && (
          <TabPanel value={1} tabValue={tabValue}>
            <CodeMirror
              ref={editorRef}
              value={text}
              onChange={handleChangeText}
              placeholder={'Напишите код'}
              className="editor"
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
              }}
              width="100%"
              extensions={[EditorState.changeFilter.of(handleLengthLimit)]}
            />
          </TabPanel>
        )}
      </div>
    </div>
  );
};
