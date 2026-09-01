import React from 'react';

import { appVersion, telegramLink, sourceLink, showDevInfo } from '@renderer/version';

import { MovingModal } from '../../UI';

interface AboutTheProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutTheProgramModal: React.FC<AboutTheProgramModalProps> = ({
  onClose,
  ...props
}) => {
  const devInfo = (
    <>
      <b>Разработка:</b>{' '}
      <a
        className="text-blue-500 transition duration-150 ease-in-out hover:text-blue-300 focus:text-blue-300 active:text-blue-700"
        href="https://polyus-nt.ru"
        target="_blank"
        rel="noopener noreferrer"
      >
        ООО «Полюс-НТ»
      </a>{' '}
      и{' '}
      <a
        className="text-blue-500 transition duration-150 ease-in-out hover:text-blue-300 focus:text-blue-300 active:text-blue-700"
        href="https://github.com/kruzhok-team/lapki-client"
        target="_blank"
        rel="noopener noreferrer"
      >
        сообщество
      </a>
    </>
  );

  return (
    <MovingModal
      {...props}
      id="about-the-program"
      onRequestClose={onClose}
      title="О программе"
      className="w-[454px]"
      hideCancelButton
    >
      <div className="text-xs leading-[15px]">
        <div className="mb-3">
          <div>Cyberiada IDE</div>
          <div>Версия: {appVersion}</div>
        </div>

        {showDevInfo && <div>{devInfo}</div>}
        <div>
          <b>Исходные коды проекта:</b>{' '}
          <a
            className="text-blue-500 transition duration-150 ease-in-out hover:text-blue-300 focus:text-blue-300 active:text-blue-700"
            href={sourceLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {sourceLink}
          </a>
        </div>
        <div>
          <b>Обратная связь:</b>{' '}
          <a
            className="text-blue-500 transition duration-150 ease-in-out hover:text-blue-300 focus:text-blue-300 active:text-blue-700"
            href="https://github.com/kruzhok-team/lapki-client/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            сообщить об ошибке,
          </a>{' '}
          <a
            className="text-blue-500 transition duration-150 ease-in-out hover:text-blue-300 focus:text-blue-300 active:text-blue-700"
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            чат в Telegram
          </a>
        </div>
      </div>
    </MovingModal>
  );
};
