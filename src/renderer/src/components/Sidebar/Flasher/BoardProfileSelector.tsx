import React, { useEffect, useId, useState } from 'react';

import { ArduinoDevice, Device, UnknownDevice } from '@renderer/components/Modules/Device';
import { Flasher } from '@renderer/components/Modules/Flasher';
import { ParameterSelect } from '@renderer/components/UI/ParameterSelect';
import { useFlasher } from '@renderer/store/useFlasher';

export const BoardProfileSelector: React.FC<{ device: Device }> = ({ device }) => {
  const selectID = useId();
  const profiles = useFlasher((state) => state.boardProfiles);
  const isFlashing = useFlasher((state) => state.isFlashing);
  const [profileID, setProfileID] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setProfileID(
      device.manuallyAssigned && device.profileID !== undefined ? String(device.profileID) : ''
    );
    setError('');
  }, [device.deviceID, device.profileID, device.manuallyAssigned]);

  if (!(device instanceof ArduinoDevice) && !(device instanceof UnknownDevice)) return null;
  if (profiles.length === 0) {
    return device instanceof UnknownDevice ? (
      <p className="border-t border-border-primary pt-4 text-text-inactive">
        Обновите загрузчик для ручного выбора платы.
      </p>
    ) : null;
  }

  const apply = async () => {
    setPending(true);
    setError('');
    try {
      await Flasher.setBoardProfile(device.deviceID, profileID === '' ? null : Number(profileID));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  };

  const options = [
    { value: '', label: device instanceof UnknownDevice ? 'Выберите плату' : 'Автоопределение' },
    ...profiles.map((profile) => ({ value: String(profile.id), label: profile.name })),
  ];
  const unchanged = profileID === (device.manuallyAssigned ? String(device.profileID) : '');

  return (
    <section className="space-y-3 border-t border-border-primary pt-4">
      <label htmlFor={selectID} className="block font-medium">
        Плата для прошивки
      </label>
      <ParameterSelect
        inputId={selectID}
        indicatorClassName="text-text-primary"
        classNames={{
          menu: () => '!bg-bg-primary [&_[role=listbox]]:!bg-bg-primary',
        }}
        aria-label="Плата для прошивки"
        options={options}
        value={options.find((option) => option.value === profileID) ?? options[0]}
        isDisabled={pending || isFlashing}
        onChange={(option) => setProfileID(option?.value ?? '')}
        noOptionsMessage={() => 'Нет подходящих плат'}
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-secondary"
          disabled={pending || isFlashing || unchanged}
          onClick={apply}
        >
          {pending ? 'Применение…' : 'Применить'}
        </button>
      </div>
      <p className="text-text-inactive">
        {device instanceof UnknownDevice
          ? 'Для прошивки выберите модель платы и нажмите «Применить».'
          : 'Можно выбрать другую модель или вернуть автоопределение.'}{' '}
        Выбор сохранится до отключения устройства или перезапуска загрузчика.
      </p>
      {error && (
        <p role="alert" className="break-words text-error">
          {error}
        </p>
      )}
    </section>
  );
};
