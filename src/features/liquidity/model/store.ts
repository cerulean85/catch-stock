'use client';

import { create } from 'zustand';
import { fetchLiquidityResult } from '../api/client';
import type { LiquidityResult } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface LiquidityStore {
  status: Status;
  result: LiquidityResult | null;
  error: string | null;
  load: (opts?: { refresh?: boolean }) => Promise<void>;
}

export const useLiquidityStore = create<LiquidityStore>((set, get) => ({
  status: 'idle',
  result: null,
  error: null,
  load: async (opts = {}) => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const result = await fetchLiquidityResult(opts);
      set({ status: 'success', result, error: null });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },
}));

