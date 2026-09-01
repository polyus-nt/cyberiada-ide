import { useLayoutEffect } from 'react';

import { Controller, useForm } from 'react-hook-form';

import { useSettings } from '@renderer/hooks';

import { MovingModal, ParameterSelect, TextField } from '../../UI';

type FormValues = Main['settings']['doc'];

interface DocSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OptionType = {
  value: FormValues['type'];
  label: string;
};

const options: OptionType[] = [
  { value: 'remote', label: 'Удалённый' },
  { value: 'local', label: 'Локальный' },
];

export const DocSelectModal: React.FC<DocSelectModalProps> = ({ onClose, ...props }) => {
  const [docSetting, setDocSetting] = useSettings('doc');
  const {
    control,
    handleSubmit: hookHandleSubmit,
    reset,
    register,
    setValue,
    watch,
  } = useForm<FormValues>();

  const isLocal = watch('type') === 'local';
  const currentServerLabel = `Текущий тип сервера: ${
    docSetting?.type === 'local' ? 'локальный' : 'удалённый'
  }`;

  const handleSubmit = hookHandleSubmit((data) => {
    setDocSetting(data);
    onClose();
  });

  const resetLocalHost = () => {
    window.electron.ipcRenderer.invoke('getLocalDocServer').then((address) => {
      setValue('localHost', address);
    });
  };

  const resetRemoteHost = () => {
    window.electron.ipcRenderer.invoke('getRemoteDocServer').then((address) => {
      setValue('remoteHost', address);
    });
  };

  const handleClose = () => {
    if (docSetting) reset(docSetting);

    onClose();
  };

  const handleReset = () => {
    if (isLocal) {
      resetLocalHost();
      return;
    }

    resetRemoteHost();
  };

  useLayoutEffect(() => {
    if (!docSetting) return;

    reset(docSetting);
  }, [reset, docSetting]);

  return (
    <MovingModal
      {...props}
      id="documentation-settings"
      onRequestClose={handleClose}
      title="Укажите адрес документации"
      submitLabel="Сохранить"
      onSubmit={handleSubmit}
      sideLabel="Сбросить"
      onSide={handleReset}
      hideCancelButton
      className="w-[348px]"
    >
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => {
            const handleChange = (option: OptionType | null) => {
              if (!option) return;

              onChange(option.value);

              if (option.value === 'local') {
                resetLocalHost();
              } else if (!docSetting?.remoteHost) {
                resetRemoteHost();
              }
            };

            return (
              <label className="flex flex-col gap-2">
                <span>Тип</span>
                <ParameterSelect
                  containerClassName="w-36"
                  value={options.find((option) => option.value === value)}
                  onChange={handleChange}
                  options={options}
                  isSearchable={false}
                />
              </label>
            );
          }}
        />

        <div className="text-text-inactive">{currentServerLabel}</div>

        <TextField
          containerClassName="gap-2"
          className="disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-inactive disabled:opacity-70"
          maxLength={80}
          {...register(isLocal ? 'localHost' : 'remoteHost', { required: true })}
          label="Адрес"
          placeholder="Напишите адрес"
          disabled={isLocal}
        />
      </div>
    </MovingModal>
  );
};
