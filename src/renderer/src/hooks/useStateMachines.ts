import { useState } from 'react';

import { useForm } from 'react-hook-form';

import { getPlatform } from '@renderer/lib/data/PlatformLoader';
import { StateMachineData } from '@renderer/lib/types';
import { generateSmId } from '@renderer/lib/utils';
import { useModelContext } from '@renderer/store/ModelContext';
import { emptyStateMachine } from '@renderer/types/diagram';

import { useModal } from './useModal';

export const useStateMachines = () => {
  const modelController = useModelContext();
  const [idx, setIdx] = useState<string | undefined>(undefined); // индекс текущей машины состояний
  const [data, setData] = useState<StateMachineData | undefined>(undefined);

  const [isAddOpen, openAdd, closeAdd] = useModal(false);
  const [isEditOpen, openEdit, editClose] = useModal(false);
  const [isDeleteOpen, openDelete, deleteClose] = useModal(false);

  const editForm = useForm<StateMachineData>();
  const addForm = useForm<StateMachineData>();

  const onRequestAddStateMachine = () => {
    setIdx(undefined);
    setData(undefined);
    openAdd();
  };

  const onRequestEditStateMachine = (idx: string) => {
    const sm = modelController.model.data.elements.stateMachines[idx];

    if (!sm) {
      console.log(`sm doesnot exist ${idx}`);
      return;
    }
    const smData = { name: sm.name ?? '', platform: sm.platform };
    setIdx(idx);
    setData(smData);
    editForm.reset(smData);
    openEdit();
  };

  const onRequestDeleteStateMachine = (idx: string) => {
    const sm = modelController.model.data.elements.stateMachines[idx];

    if (!sm) return;

    const smData = { name: sm.name ?? '', platform: sm.platform };
    setIdx(idx);
    setData(smData);
    editForm.reset(smData);
    openDelete();
  };

  const onDuplicateStateMachine = () => {
    if (!idx) return;

    const sm = modelController.model.data.elements.stateMachines[idx];

    if (!sm) return;
    const [canvasId] = modelController.duplicateStateMachine(idx);

    modelController.changeHeadControllerId(canvasId);

    editClose();
  };

  const onAdd = (data: StateMachineData) => {
    const platformIdx = data.platform;
    const platform = getPlatform(platformIdx);
    if (!platform) {
      throw Error('unknown platform ' + platformIdx);
    }

    const smId = generateSmId(isDuplicateName, platform);

    const sm = { ...emptyStateMachine(), ...data };
    const canvasId = modelController.createStateMachine(smId, sm);
    modelController.changeHeadControllerId(canvasId);
  };

  const onEdit = (data: StateMachineData) => {
    if (!idx) return;
    const newName = data.name === '' ? undefined : data.name;
    modelController.editStateMachine(idx, { ...data, name: newName });
  };

  const onDelete = () => {
    if (!idx) return;
    modelController.deleteStateMachine(idx);

    editClose();
  };

  /**
   * Использовать только после вызова {@link onRequestEditStateMachine} или {@link onRequestAddStateMachine}.
   * @param name имя машины состояний.
   * @returns true, если имя дублирует имя другой машины состояний или её ID;
   * false, если имя отсутствует, или оно не дублирует другие имена или ID.
   */
  const isDuplicateName = (name: string) => {
    if (!name) return false;
    const machines = Object.entries(modelController.model.data.elements.stateMachines);
    for (const [id, value] of machines) {
      if (id == idx) continue;
      if ((value.name && value.name == name) || name == id) {
        return true;
      }
    }
    return false;
  };

  // TODO (L140-beep): swap state machines
  // const onSwapComponents = (name1: string, name2: string) => {
  //   modelController.swapComponents({ smId: currentSm, name1, name2 });
  // };

  return {
    addProps: {
      isOpen: isAddOpen,
      onClose: closeAdd,
      onSubmit: onAdd,
      addForm,
    },
    editProps: {
      isOpen: isEditOpen,
      onClose: editClose,
      onEdit,
      onDelete: openDelete,
      editForm,
    },
    deleteProps: {
      isOpen: isDeleteOpen,
      onClose: deleteClose,
      onSubmit: onDelete,
      data: data,
      idx: idx,
    },
    onDuplicateStateMachine,
    onRequestDeleteStateMachine,
    onRequestAddStateMachine,
    onRequestEditStateMachine,
    isDuplicateName,
  };
};
