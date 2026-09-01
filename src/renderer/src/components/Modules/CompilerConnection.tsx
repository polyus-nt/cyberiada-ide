import { useEffect, useRef, useState } from 'react';

import { useSettings } from '@renderer/hooks';
import { useManagerMS } from '@renderer/store/useManagerMS';
import { Elements } from '@renderer/types/diagram';

import { Compiler } from './Compiler';

interface CompilerConnectionProps {
  openData: [boolean, string | null, string | null, string] | undefined;
  onImportData: (
    importData: Elements,
    openData: [boolean, string | null, string | null, string]
  ) => void;
}

/** Owns the single application-wide compiler connection and its React bindings. */
export const CompilerConnection = ({ openData, onImportData }: CompilerConnectionProps) => {
  const [compilerSetting] = useSettings('compiler');
  const [importData, setImportData] = useState<Elements>();
  const onImportDataRef = useRef(onImportData);
  const { setCompilerData, setCompilerStatus, setSecondsUntilCompilerReconnect } = useManagerMS();

  useEffect(() => {
    onImportDataRef.current = onImportData;
  }, [onImportData]);

  useEffect(() => {
    if (!importData || !openData) return;

    onImportDataRef.current(importData, openData);
    setImportData(undefined);
  }, [importData, openData]);

  useEffect(() => {
    if (!compilerSetting) return;

    const { localHost, localPort, remoteHost, remotePort, type } = compilerSetting;
    Compiler.bindReact(
      setCompilerData,
      setCompilerStatus,
      setImportData,
      setSecondsUntilCompilerReconnect
    );
    const autoReconnect = type === 'remote';
    if (type === 'local') {
      Compiler.connect(localHost, localPort, autoReconnect);
    } else {
      Compiler.connect(remoteHost, remotePort, autoReconnect);
    }
  }, [compilerSetting, setCompilerData, setCompilerStatus, setSecondsUntilCompilerReconnect]);

  return null;
};
