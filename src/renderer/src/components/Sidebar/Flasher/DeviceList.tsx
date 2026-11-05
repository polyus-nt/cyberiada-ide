import React, { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';

import { ReactComponent as Update } from '@renderer/assets/icons/update.svg';
import { Flasher } from '@renderer/components/Modules/Flasher';
import { Modal, ScrollArea } from '@renderer/components/UI';
import { useFlasher } from '@renderer/store/useFlasher';

import { BoardProfileSelector } from './BoardProfileSelector';

import { ArduinoDevice, BlgMbDevice, Device, MSDevice, UnknownDevice } from '../../Modules/Device';
import { ClientStatus } from '../../Modules/Websocket/ClientStatus';

interface DeviceListProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (deviceIds: string[]) => void;
  submitLabel: string;
  devices: Map<string, Device>;
  allowUnknownSelection?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitLabel,
  devices,
  allowUnknownSelection = false,
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

  const selectedDevice = currentDeviceID ? devices.get(currentDeviceID) : undefined;
  const canSelect =
    !!selectedDevice && (allowUnknownSelection || !(selectedDevice instanceof UnknownDevice));

  const deviceInfoDisplay = (device: Device) => {
    const details: [string, string][] = [];
    if (device instanceof UnknownDevice) {
      details.push(['Порт', device.portName]);
      if (device.serialID) details.push(['Серийный номер', device.serialID]);
      if (device.vendorID || device.productID) {
        details.push(['VID / PID', `${device.vendorID || '—'} / ${device.productID || '—'}`]);
      }
    } else if (device instanceof MSDevice) {
      details.push(['Порты', device.portNames.join('; ')]);
    } else if (device instanceof ArduinoDevice) {
      details.push(['Порт', device.portName]);
      if (device.serialID) details.push(['Серийный номер', device.serialID]);
      details.push(['Контроллер', device.controller], ['Программатор', device.programmer]);
    } else if (device instanceof BlgMbDevice) {
      details.push(['Версия', device.version]);
    }
    return (
      <div className="space-y-4">
        <h3 className="break-words font-medium [overflow-wrap:anywhere]">{device.displayName()}</h3>
        {details.length > 0 ? (
          <dl className="space-y-2">
            {details.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                <dt className="text-text-inactive">{label}</dt>
                <dd className="break-words [overflow-wrap:anywhere]">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-text-inactive">Дополнительная информация отсутствует</p>
        )}
        <BoardProfileSelector key={device.deviceID} device={device} />
      </div>
    );
  };

  const handleSubmit = hookHandleSubmit(() => {
    if (!currentDeviceID || !canSelect) return;
    // TODO: реализовать передачу нескольких устройств одновременно
    onSubmit([currentDeviceID]);
    onClose();
  });

  const renderContent = () => {
    if (connectionStatus === ClientStatus.CONNECTED) {
      return (
        <div className="grid min-h-0 gap-5 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <section className="flex min-w-0 flex-col gap-3">
            <div className="flex h-6 items-center justify-between gap-3">
              <h2 className="font-medium">
                Устройства <span className="text-text-inactive">{devices.size}</span>
              </h2>
              <button
                className="rounded p-1 text-text-inactive transition-colors hover:bg-bg-hover hover:text-text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
                onClick={handleGetList}
                type="button"
                aria-label="Обновить список устройств"
                title="Обновить список устройств"
              >
                <Update className="h-4 w-4" />
              </button>
            </div>
            <ScrollArea
              className="h-40 rounded-lg border border-border-primary bg-bg-control py-0 sm:h-[340px]"
              viewportClassName="p-2"
              verticalOverflowViewportClassName="pr-3"
              horizontalScroll={false}
            >
              {devices.size === 0 ? (
                <p className="px-3 py-2 text-text-inactive">Устройства не найдены</p>
              ) : (
                [...devices].map(([key, device]) => (
                  <button
                    key={key}
                    aria-pressed={isActive(key)}
                    className={twMerge(
                      'mb-1 flex min-h-9 w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-left transition-colors last:mb-0 hover:bg-bg-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary',
                      isActive(key) && 'bg-bg-active hover:bg-bg-active'
                    )}
                    onClick={() => setCurrentDevice(key)}
                    type="button"
                  >
                    <span className="w-full break-words [overflow-wrap:anywhere]">
                      {device.displayName()}
                    </span>
                  </button>
                ))
              )}
            </ScrollArea>
          </section>

          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="flex h-6 items-center font-medium">Описание устройства</h2>
            <ScrollArea
              className="h-[340px] rounded-lg border border-border-primary py-0"
              viewportClassName="p-4 text-left"
              verticalOverflowViewportClassName="pr-5"
              horizontalScroll={false}
            >
              {selectedDevice ? (
                deviceInfoDisplay(selectedDevice)
              ) : (
                <p className="text-text-inactive">
                  Выберите устройство из списка, чтобы посмотреть информацию о нём
                </p>
              )}
            </ScrollArea>
          </section>
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
      className="w-[760px] max-w-[calc(100vw-32px)] overflow-y-auto"
      onRequestClose={onClose}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
      hideCancelButton
      submitDisabled={!canSelect}
    >
      {renderContent()}
    </Modal>
  );
};
