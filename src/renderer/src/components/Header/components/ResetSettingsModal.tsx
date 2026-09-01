import { useForm } from 'react-hook-form';

import { fullResetSetting } from '@renderer/hooks';

import { MovingModal } from '../../UI';

interface ResetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetSettingsModal: React.FC<ResetSettingsModalProps> = ({ onClose, ...props }) => {
  const { handleSubmit: hookHandleSubmit } = useForm();
  const resetLabel = 'Сбросить';
  const handleSubmit = hookHandleSubmit(() => {
    fullResetSetting().then(() => {
      location.reload();
    });
  });

  return (
    <MovingModal
      {...props}
      id="reset-settings"
      onRequestClose={onClose}
      title="Сброс настроек"
      submitLabel={resetLabel}
      onSubmit={handleSubmit}
      hideCancelButton
      className="w-[348px]"
    >
      <div className="text-xs leading-[15px]">
        Вы уверены, что хотите сбросить настройки? Это действие{' '}
        <b className="text-primary">нельзя будет отменить.</b> После нажатия на кнопку &quot;
        {resetLabel}&quot; IDE <b className="text-primary">перезапустится</b>, все значения настроек
        вернутся к изначальным, а{' '}
        <b className="text-primary">несохранённые изменения в документе будут утеряны!</b>
      </div>
    </MovingModal>
  );
};
