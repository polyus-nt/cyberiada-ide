import React from 'react';

import { useSettings } from '@renderer/hooks';
import { useModelContext } from '@renderer/store/ModelContext';
import { useFlasher } from '@renderer/store/useFlasher';

import { ClientStatus } from '../../Modules/Websocket/ClientStatus';
import { DropdownMenu, DropdownMenuItem } from '../../UI';

export interface SettingProps {
  openCompilerSettings: () => void;
  openAboutModal: () => void;
  openResetSettings: () => void;
  openLoaderSettings: () => void;
  openAutosaveSettings: () => void;
  openDocumentationSettings: () => void;
  onItemSelect?: () => void;
}

export const Setting: React.FC<SettingProps> = ({
  openCompilerSettings,
  openAboutModal,
  openResetSettings,
  openLoaderSettings,
  openAutosaveSettings,
  openDocumentationSettings,
  onItemSelect,
}) => {
  const modelController = useModelContext();
  const headControllerId = modelController.model.useData('', 'headControllerId');
  const controller = modelController.controllers[headControllerId];
  const editor = controller.app;
  const isMounted = controller.useData('isMounted');
  const [theme, setTheme] = useSettings('theme');
  const [canvasSettings, setCanvasSettings] = useSettings('canvas');
  const { connectionStatus, isFlashing } = useFlasher();

  const handleChangeTheme = (value: 'light') => {
    setTheme(value);
    document.documentElement.dataset.theme = value;

    if (isMounted) {
      editor.view.isDirty = true;
    }

    onItemSelect?.();
  };

  const handleChangeCanvasAnimations = (value: boolean) => {
    if (!canvasSettings) return;

    setCanvasSettings({
      ...canvasSettings,
      animations: value,
    });
    onItemSelect?.();
  };

  const selectAndOpen = (open: () => void) => {
    onItemSelect?.();
    open();
  };

  return (
    <DropdownMenu>
      <div className="group relative">
        <DropdownMenuItem className="justify-between" aria-haspopup="menu">
          Тема
          <span aria-hidden="true">›</span>
        </DropdownMenuItem>
        <DropdownMenu className="dropdown-submenu">
          {(['light'] as const).map((value) => (
            <DropdownMenuItem
              key={value}
              role="menuitemradio"
              aria-checked={theme === value}
              className="justify-between"
              onClick={() => handleChangeTheme(value)}
            >
              {value === 'light' ? 'Светлая' : 'Тёмная'}
              {theme === value && <span aria-hidden="true">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </div>

      <DropdownMenuItem onClick={() => selectAndOpen(openCompilerSettings)}>
        Компилятор
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => selectAndOpen(openLoaderSettings)}
        disabled={connectionStatus === ClientStatus.CONNECTING || isFlashing}
      >
        Загрузчик
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => selectAndOpen(openDocumentationSettings)}>
        Документация
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => selectAndOpen(openAutosaveSettings)}>
        Автосохранение
      </DropdownMenuItem>

      <div className="group relative">
        <DropdownMenuItem className="justify-between" aria-haspopup="menu">
          Анимации на холсте
          <span aria-hidden="true">›</span>
        </DropdownMenuItem>
        <DropdownMenu className="dropdown-submenu">
          <DropdownMenuItem
            role="menuitemradio"
            aria-checked={canvasSettings?.animations === true}
            className="justify-between"
            onClick={() => handleChangeCanvasAnimations(true)}
          >
            Вкл
            {canvasSettings?.animations && <span aria-hidden="true">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            role="menuitemradio"
            aria-checked={canvasSettings?.animations === false}
            className="justify-between"
            onClick={() => handleChangeCanvasAnimations(false)}
          >
            Выкл
            {canvasSettings && !canvasSettings.animations && <span aria-hidden="true">✓</span>}
          </DropdownMenuItem>
        </DropdownMenu>
      </div>

      <DropdownMenuItem onClick={() => selectAndOpen(openResetSettings)}>
        Сбросить настройки
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => selectAndOpen(openAboutModal)}>О программе</DropdownMenuItem>
    </DropdownMenu>
  );
};
