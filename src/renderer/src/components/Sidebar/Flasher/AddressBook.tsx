import { useState } from 'react';

import { useForm } from 'react-hook-form';

import { ReactComponent as AddIcon } from '@renderer/assets/icons/add.svg';
import { ReactComponent as EditIcon } from '@renderer/assets/icons/edit.svg';
import { ReactComponent as LensIcon } from '@renderer/assets/icons/metadata.svg';
import { ReactComponent as SubtractIcon } from '@renderer/assets/icons/subtract.svg';
import { Modal, ScrollArea } from '@renderer/components/UI';
import { useModal } from '@renderer/hooks';
import { AddressData } from '@renderer/types/FlasherTypes';

import { AddressBookRow } from './AddressBookRow';
import { MetaDataModal } from './MetaData';

interface AddressBookModalProps {
  addressBookSetting: AddressData[] | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entryId: number) => void;
  onRemove: (index: number) => void;
  onSwapEntries: (index1: number, index2: number) => void;
  getID: (index: number) => number | null;
  addressEnrtyEdit: (data: AddressData) => void;
  openAddressEnrtyAdd: () => void;
}

/** Модальное окно с адресной книгой МС-ТЮК. */
export const AddressBookModal: React.FC<AddressBookModalProps> = ({
  addressBookSetting,
  isOpen,
  onRemove,
  onSwapEntries,
  getID,
  onClose,
  onSubmit,
  addressEnrtyEdit,
  openAddressEnrtyAdd,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<number>();
  const [dragIndex, setDragIndex] = useState<number>();
  const [isMetaDataOpen, openMetaData, closeMetaData] = useModal(false);
  const { handleSubmit: hookHandleSubmit } = useForm();

  const selectedData =
    selectedEntry === undefined ? undefined : addressBookSetting?.[selectedEntry];

  const handleSwapEntries = (index: number) => {
    if (addressBookSetting === null || dragIndex === undefined) {
      setDragIndex(undefined);
      return;
    }

    onSwapEntries(dragIndex, index);
    if (selectedEntry === dragIndex) {
      setSelectedEntry(index);
    } else if (selectedEntry === index) {
      setSelectedEntry(dragIndex);
    }
    setDragIndex(undefined);
  };

  const handleEdit = (data: AddressData, index: number) => {
    setSelectedEntry(index);
    addressEnrtyEdit(data);
  };

  const handleRemove = () => {
    if (selectedEntry === undefined) return;
    onRemove(selectedEntry);
    setSelectedEntry(undefined);
  };

  const handleSubmit = hookHandleSubmit(() => {
    if (selectedEntry === undefined || addressBookSetting === null) return;
    const id = getID(selectedEntry);
    if (id !== null) onSubmit(id);
  });

  const handleClose = () => {
    setSelectedEntry(undefined);
    setDragIndex(undefined);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={handleClose}
        title="Адресная книга"
        onSubmit={handleSubmit}
        submitDisabled={selectedEntry === undefined}
        submitLabel="Добавить в таблицу прошивок"
        className="top-[18px] box-border flex h-[430px] max-h-[calc(100vh-36px)] w-[calc(100%-40px)] max-w-[720px] flex-col bg-bg-primary p-6"
        headerClassName="mb-[23px] min-h-[39px] pb-3"
        titleClassName="text-xs font-medium"
        closeClassName="p-2"
        closeIconClassName="h-2.5 w-2.5"
        formClassName="flex min-h-0 flex-1 flex-col"
        contentClassName="mb-0 min-h-0 flex-1"
        actionsClassName="mt-6"
        submitClassName="btn-primary h-8 min-w-0 px-3 py-1.5"
        hideCancelButton
      >
        <section className="flex h-full min-h-0 flex-col">
          <div className="mb-4 flex min-h-8 shrink-0 items-center gap-3 overflow-x-auto">
            <button
              type="button"
              className="btn-secondary flex h-8 min-w-0 items-center gap-2 border-primary px-3 py-1.5 text-primary"
              onClick={openAddressEnrtyAdd}
              disabled={!addressBookSetting}
            >
              <AddIcon className="h-4 w-4" />
              Добавить
            </button>
            <button
              type="button"
              className="btn-secondary flex h-8 min-w-0 items-center gap-2 border-primary px-3 py-1.5 text-primary"
              onClick={() => selectedData && addressEnrtyEdit(selectedData)}
              disabled={!selectedData}
            >
              <EditIcon className="h-4 w-4" />
              Изменить
            </button>
            <button
              type="button"
              className="btn-secondary danger flex h-8 min-w-0 items-center gap-2 border-red-500 px-3 py-1.5"
              onClick={handleRemove}
              disabled={!selectedData}
            >
              <SubtractIcon className="h-4 w-4" />
              Удалить
            </button>
            <button
              type="button"
              className="ml-auto flex h-8 min-w-0 items-center gap-2 whitespace-nowrap px-0 py-1.5 text-primary transition-opacity enabled:hover:opacity-75 disabled:opacity-30"
              onClick={openMetaData}
              disabled={!selectedData}
            >
              <LensIcon className="h-4 w-4" />
              Метаданные
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-primary">
            <div className="grid min-h-9 shrink-0 grid-cols-[minmax(120px,1fr)_160px_minmax(120px,1fr)] items-center border-b border-border-primary bg-bg-secondary px-3 py-2 font-medium">
              <span>Название</span>
              <span>Адрес</span>
              <span>Тип</span>
            </div>
            <ScrollArea className="min-h-0 flex-1" viewportClassName="p-1.5" role="listbox">
              {addressBookSetting === null ? (
                <p className="px-3 py-2 text-text-inactive">Адресная книга не загрузилась</p>
              ) : addressBookSetting.length === 0 ? (
                <p className="px-3 py-2 text-text-inactive">Нет записей в книге</p>
              ) : (
                addressBookSetting.map((field, index) => {
                  const id = getID(index);
                  if (id === null) return null;
                  return (
                    <AddressBookRow
                      key={id}
                      isSelected={index === selectedEntry}
                      data={field}
                      onSelect={() => setSelectedEntry(index)}
                      onEdit={() => handleEdit(field, index)}
                      onDragStart={() => setDragIndex(index)}
                      onDrop={() => handleSwapEntries(index)}
                    />
                  );
                })
              )}
            </ScrollArea>
          </div>
        </section>
      </Modal>

      {selectedData && (
        <MetaDataModal addressData={selectedData} isOpen={isMetaDataOpen} onClose={closeMetaData} />
      )}
    </>
  );
};
