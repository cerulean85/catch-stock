'use client';

import { create } from 'zustand';
import { fetchMarketNews } from '../api/client';
import type { MarketNewsResult } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface NewsStore {
  status: Status;
  result: MarketNewsResult | null;
  error: string | null;
  load: (opts?: { refresh?: boolean }) => Promise<void>;
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  status: 'idle',
  result: null,
  error: null,
  load: async (opts = {}) => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const result = await fetchMarketNews(opts);
      set({ status: 'success', result, error: null });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },
}));
