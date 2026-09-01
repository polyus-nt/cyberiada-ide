import React, { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';

import { ReactComponent as Update } from '@renderer/assets/icons/update.svg';
import { Flasher } from '@renderer/components/Modules/Flasher';
import { Modal } from '@renderer/components/UI';
import { useFlasher } from '@renderer/store/useFlasher';

import { ArduinoDevice, BlgMbDevice, Device, MSDevice } from '../../Modules/Device';
import { ClientStatus } from '../../Modules/Websocket/ClientStatus';

interface DeviceListProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (deviceIds: string[]) => void;
  submitLabel: string;
  devices: Map<string, Device>;
  listExtraLabel?: string;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitLabel,
  devices,
  listExtraLabel,
  ...props
}) => {
  const { handleSubmit: hookHandleSubmit } = useForm();
  const { connectionStatus } = useFlasher();
  const [currentDeviceID, setCurrentDevice] = useState<string | undefined>(undefined);

  const isActive = (id: string) => currentDeviceID === id;

  useEffect(() => {
    if (!currentDeviceID) return;

    if (!devices.has(currentDeviceID)) {
      setCurrentDevice(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  const handleGetList = async () => {
    Flasher.getList();
  };

  const deviceInfoDisplay = (device: Device | undefined) => {
    if (!device) return;
    if (device.isMSDevice()) {
      const MSDevice = device as MSDevice;
      let portNames = MSDevice.portNames[0];
      for (let i = 1; i < MSDevice.portNames.length; i++) {
        portNames = portNames + '; ' + MSDevice.portNames[i];
      }
      return (
        <div>
          <p>{MSDevice.name}</p>
          <p>Порты: {portNames}</p>
        </div>
      );
    } else if (device.isArduinoDevice()) {
      const ArduinoDevice = device as ArduinoDevice;
      return (
        <div>
          <p> {ArduinoDevice.name}</p>
          <p>Серийный номер: {ArduinoDevice.serialID}</p>
          <p>Порт: {ArduinoDevice.portName}</p>
          <p>Контроллер: {ArduinoDevice.controller}</p>
          <p>Программатор: {ArduinoDevice.programmer}</p>
        </div>
      );
    } else if (device.isBlgMbDevice()) {
      const BlgMbDevice = device as BlgMbDevice;
      return (
        <div>
          <p> {BlgMbDevice.name}</p>
          <p>Версия: {BlgMbDevice.version}</p>
        </div>
      );
    } else {
      return <div className="text-center">Дополнительная информация отсутствует</div>;
    }
  };

  const handleSubmit = hookHandleSubmit(() => {
    if (!currentDeviceID) {
      onClose();
      return;
    }
    // TODO: реализовать передачу нескольких устройств одновременно
    onSubmit([currentDeviceID]);
    onClose();
  });

  const renderContent = () => {
    if (connectionStatus === ClientStatus.CONNECTED) {
      return (
        <div className="grid h-full min-h-0 grid-cols-2 gap-6">
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex min-h-[32px] items-center justify-between gap-3">
              <span className="font-medium">Устройства</span>
              {listExtraLabel && (
                <span className="truncate text-text-inactive">{listExtraLabel}</span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border-primary p-1.5 scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
              {devices.size === 0 ? (
                <p className="px-3 py-2 text-text-inactive">Устройства не найдены</p>
              ) : (
                [...devices.keys()].map((key) => (
                  <button
                    key={key}
                    className={twMerge(
                      'block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-hover',
                      isActive(key) && 'bg-bg-active hover:bg-bg-active'
                    )}
                    onClick={() => setCurrentDevice(key)}
                    type="button"
                  >
                    {devices.get(key)?.displayName()}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <span className="mb-2 flex min-h-[32px] items-center font-medium">
              Информация об устройстве
            </span>
            <div className="min-h-0 flex-1 overflow-y-auto break-words rounded-lg border border-border-primary p-3 text-left leading-[18px] scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
              {currentDeviceID ? (
                deviceInfoDisplay(devices.get(currentDeviceID))
              ) : (
                <p className="text-text-inactive">Выберите устройство из списка</p>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid h-full place-items-center text-text-inactive">
          Отсутствует подключение к загрузчику
        </div>
      );
    }
  };

  return (
    <Modal
      {...props}
      isOpen={isOpen}
      title="Список устройств"
      onRequestClose={onClose}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
      className="top-[18px] box-border flex h-[430px] max-h-[calc(100vh-36px)] w-[calc(100%-40px)] max-w-[640px] flex-col bg-bg-primary p-6"
      headerClassName="mb-[23px] min-h-[39px] pb-3"
      titleClassName="text-xs font-medium"
      closeClassName="p-2"
      closeIconClassName="h-2.5 w-2.5"
      formClassName="flex min-h-0 flex-1 flex-col"
      contentClassName="mb-0 min-h-0 flex-1"
      actionsClassName="mt-6"
      submitClassName="btn-primary h-8 min-w-[77px] px-3 py-1.5"
      hideCancelButton
      submitDisabled={!currentDeviceID}
    >
      <section className="flex h-full min-h-0 flex-col">
        <button
          className="btn-secondary mb-4 flex h-8 w-fit min-w-0 items-center justify-center gap-2 border-primary px-3 py-1.5 text-primary"
          onClick={() => handleGetList()}
          disabled={connectionStatus !== ClientStatus.CONNECTED}
          type="button"
        >
          <Update className="h-4 w-4" />
          Обновить
        </button>
        <div className="min-h-0 flex-1">{renderContent()}</div>
      </section>
    </Modal>
  );
};
