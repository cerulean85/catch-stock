'use client';

import { create } from 'zustand';
import { fetchScreenerResult } from '../api/client';
import type { ScreenerResult } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface ScreenerStore {
  status: Status;
  result: ScreenerResult | null;
  error: string | null;
  load: (opts?: { refresh?: boolean }) => Promise<void>;
}

export const useScreenerStore = create<ScreenerStore>((set, get) => ({
  status: 'idle',
  result: null,
  error: null,
  load: async (opts = {}) => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const result = await fetchScreenerResult(opts);
      set({ status: 'success', result, error: null });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },
}));
