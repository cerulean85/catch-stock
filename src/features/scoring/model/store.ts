'use client';

import { create } from 'zustand';
import { fetchScreen } from '../api/client';
import type { ScreenResponse } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface ScoringStore {
  status: Status;
  preset: string;
  universe: string;
  result: ScreenResponse | null;
  error: string | null;
  setPreset: (preset: string) => void;
  setUniverse: (universe: string) => void;
  load: (opts?: { refresh?: boolean }) => Promise<void>;
}

export const useScoringStore = create<ScoringStore>((set, get) => ({
  status: 'idle',
  preset: 'balanced',
  universe: 'default',
  result: null,
  error: null,
  setPreset: (preset) => set({ preset }),
  setUniverse: (universe) => set({ universe }),
  load: async (opts = {}) => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const { preset, universe } = get();
      const result = await fetchScreen({ preset, universe, refresh: opts.refresh });
      set({ status: 'success', result, error: null });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },
}));
