import { create } from 'zustand';

import { MSDevice } from '@renderer/components/Modules/Device';
import { CompilerStatus } from '@renderer/components/Modules/Websocket/ClientStatus';
import { CompilerResult } from '@renderer/types/CompilerTypes';
import { AddressAndMeta } from '@renderer/types/FlasherTypes';

interface ManagerMSState {
  device: MSDevice | undefined;
  setDevice: (currentDevice: MSDevice | undefined) => void;
  log: string[];
  setLog: (update: (prevMessages: string[]) => string[]) => void;
  compilerData: CompilerResult | undefined;
  setCompilerData: (data: CompilerResult | undefined) => void;
  compilerStatus: string;
  setCompilerStatus: (status: string) => void;
  secondsUntilCompilerReconnect: number | null;
  setSecondsUntilCompilerReconnect: (seconds: number | null) => void;
  devicesCnt: number;
  setDevicesCnt: (newDevicesCnt: number) => void;
  addressAndMeta: AddressAndMeta | undefined;
  setAddressAndMeta: (newAddressAndMeta: AddressAndMeta | undefined) => void;
}

export const useManagerMS = create<ManagerMSState>((set) => ({
  device: undefined,
  setDevice: (newDevice) => set({ device: newDevice }),
  log: [],
  setLog: (update) => set((value) => ({ log: update(value.log) })),
  compilerData: undefined,
  setCompilerData: (newCompilerData) => set({ compilerData: newCompilerData }),
  compilerStatus: CompilerStatus.NO_CONNECTION,
  setCompilerStatus: (compilerStatus) => set({ compilerStatus }),
  secondsUntilCompilerReconnect: null,
  setSecondsUntilCompilerReconnect: (secondsUntilCompilerReconnect) =>
    set({ secondsUntilCompilerReconnect }),
  devicesCnt: 0,
  setDevicesCnt: (newDevicesCnt: number) => set({ devicesCnt: newDevicesCnt }),
  addressAndMeta: undefined,
  setAddressAndMeta: (newAddressAndMeta: AddressAndMeta | undefined) =>
    set({ addressAndMeta: newAddressAndMeta }),
}));
