import { create } from 'zustand';

export type PrimaryWorkspace = 'editor' | 'simulator';

interface WorkspaceState {
  activeWorkspace: PrimaryWorkspace;
  setActiveWorkspace: (workspace: PrimaryWorkspace) => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  activeWorkspace: 'editor',
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
}));
