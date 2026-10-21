import React, { useEffect, useState } from 'react';

import { ArduinoDevice, Device, UnknownDevice } from '@renderer/components/Modules/Device';
import { Flasher } from '@renderer/components/Modules/Flasher';
import { useFlasher } from '@renderer/store/useFlasher';

export const BoardProfileSelector: React.FC<{ device: Device }> = ({ device }) => {
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
      <p>Обновите загрузчик для ручного выбора платы.</p>
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

  return (
    <div className="mt-3 space-y-2 text-left">
      <label className="block">
        Плата
        <select
          aria-label="Плата"
          className="mt-1 w-full rounded border border-border-primary bg-bg-control p-1"
          value={profileID}
          disabled={pending || isFlashing}
          onChange={(event) => setProfileID(event.target.value)}
        >
          <option value="">Автоопределение</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="text-primary disabled:opacity-60"
        disabled={pending || isFlashing || (profileID === '' && !device.manuallyAssigned)}
        onClick={apply}
      >
        {pending ? 'Применение…' : 'Применить'}
      </button>
      <p className="text-sm text-text-inactive">
        Выбор действует до отключения устройства или перезапуска загрузчика.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
};
