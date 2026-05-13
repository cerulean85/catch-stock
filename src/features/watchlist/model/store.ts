'use client';

import { create } from 'zustand';
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
} from '../api/client';
import type { WatchlistResult } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';
type Notice = { type: 'added' | 'removed'; symbol: string };

interface WatchlistStore {
  status: Status;
  result: WatchlistResult | null;
  error: string | null;
  notice: Notice | null;
  load: () => Promise<void>;
  add: (symbol: string) => Promise<void>;
  remove: (symbol: string) => Promise<void>;
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
  status: 'idle',
  result: null,
  error: null,
  notice: null,
  load: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const result = await fetchWatchlist();
      set({ status: 'success', result, error: null });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },
  add: async (symbol) => {
    set({ error: null, notice: null });
    try {
      await addWatchlistItem(symbol);
      await get().load();
      set({ notice: { type: 'added', symbol: symbol.trim().toUpperCase() } });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  },
  remove: async (symbol) => {
    set({ error: null, notice: null });
    try {
      await removeWatchlistItem(symbol);
      await get().load();
      set({ notice: { type: 'removed', symbol: symbol.trim().toUpperCase() } });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  },
}));
