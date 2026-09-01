import React, { useState } from 'react';

import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { useSettings } from '@renderer/hooks';
import { getPlatform } from '@renderer/lib/data/PlatformLoader';

import { Modal } from './UI';

interface OpenRecentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filePath: string) => void;
}

export const OpenRecentModal: React.FC<OpenRecentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ...props
}) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState<number | null>(null);
  const [recentFiles, setRecentFiles] = useSettings('recentFiles');

  if (recentFiles === null) return;

  const handleClose = () => {
    setSelectedFileIdx(null);
    onClose();
  };

  const submit = async (fileIdx = selectedFileIdx) => {
    if (fileIdx === null) return;

    const selectedFile = recentFiles[fileIdx];
    if (!selectedFile) return;

    const exists = await window.api.fileHandlers.existsFile(selectedFile.path);
    if (exists) {
      onSubmit(selectedFile.path);
      handleClose();
      return;
    }

    setRecentFiles(recentFiles.filter((file) => file.path !== selectedFile.path));
    setSelectedFileIdx(null);
    toast.error('Не удаётся найти выбранный файл');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const renderDescription = () => {
    if (selectedFileIdx === null) {
      return <p>Выберите документ из списка</p>;
    }

    const selectedFile = recentFiles[selectedFileIdx];
    if (!selectedFile) return null;

    return (
      <div className="max-h-[190px] overflow-y-auto break-words pr-1 leading-[15px] scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
        <p>
          <b>Путь:</b>
        </p>
        <p>{selectedFile.path}</p>

        <div className="mt-3">
          <p>
            <b>Машины состояний</b>
          </p>
          {selectedFile.stateMachines.map((stateMachine, idx) => {
            if (stateMachine.name === '') return null;

            const platform = getPlatform(stateMachine.platformIdx);
            if (platform === undefined) return null;

            return (
              <div
                className={twMerge(idx > 0 && 'mt-2')}
                key={`${selectedFile.path}-${stateMachine.name}-${stateMachine.platformIdx}`}
              >
                <p>
                  <b>Название:</b> {stateMachine.name}
                </p>
                <p>
                  <b>Платформа:</b> {platform.name ?? 'Неизвестная платформа'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFileList = () => (
    <div className="grid grid-cols-[274px_minmax(0,1fr)] gap-6">
      <div className="h-[190px] overflow-y-auto rounded-lg border border-border-primary p-1.5 scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
        {recentFiles.map((file, idx) => (
          <button
            type="button"
            key={file.path}
            className={twMerge(
              'block w-full select-none rounded-lg px-3 py-1 text-left leading-[17px] transition-colors duration-75 hover:bg-bg-hover',
              selectedFileIdx === idx && 'bg-bg-active hover:bg-bg-active'
            )}
            onClick={() => setSelectedFileIdx(idx)}
            onDoubleClick={() => void submit(idx)}
          >
            {file.name}
          </button>
        ))}
      </div>

      <div>{renderDescription()}</div>
    </div>
  );

  return (
    <Modal
      {...props}
      className="top-[18px] box-border flex h-[356px] max-h-[calc(100vh-36px)] w-[calc(100%-40px)] max-w-[667px] flex-col bg-bg-primary p-6"
      headerClassName="mb-[23px] min-h-[39px] pb-3"
      titleClassName="text-xs font-normal"
      closeClassName="p-2"
      closeIconClassName="h-2.5 w-2.5"
      formClassName="flex min-h-0 flex-1 flex-col"
      contentClassName="mb-0 min-h-0 flex-1"
      actionsClassName="mt-auto"
      submitClassName="btn-primary h-8 min-w-[77px] px-3 py-2 disabled:border-border-primary disabled:bg-border-primary disabled:text-text-secondary disabled:opacity-100"
      hideCancelButton
      isOpen={isOpen}
      onRequestClose={handleClose}
      onSubmit={handleSubmit}
      submitDisabled={selectedFileIdx === null}
      title="Недавние документы"
      submitLabel="Открыть"
    >
      {recentFiles.length > 0 ? (
        renderFileList()
      ) : (
        <div className="grid h-[190px] place-items-center">
          <p>У вас пока нет недавних документов.</p>
        </div>
      )}
    </Modal>
  );
};
