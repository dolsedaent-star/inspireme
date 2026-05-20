import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'inspireme.viewedFigures.v1';

type Ctx = {
  ready: boolean;
  viewedIds: string[];
  markViewed: (id: string) => Promise<void>;
  resetViewed: () => Promise<void>;
};

const ViewedFiguresContext = createContext<Ctx | null>(null);

export function ViewedFiguresProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setViewedIds(JSON.parse(raw));
      } catch {
        // corrupt or first launch — start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: string[]) => {
    setViewedIds(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const markViewed = useCallback(
    async (id: string) => {
      if (viewedIds.includes(id)) return;
      await persist([...viewedIds, id]);
    },
    [viewedIds, persist],
  );

  const resetViewed = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const value = useMemo<Ctx>(
    () => ({ ready, viewedIds, markViewed, resetViewed }),
    [ready, viewedIds, markViewed, resetViewed],
  );

  return <ViewedFiguresContext.Provider value={value}>{children}</ViewedFiguresContext.Provider>;
}

export function useViewedFigures(): Ctx {
  const ctx = useContext(ViewedFiguresContext);
  if (!ctx) throw new Error('useViewedFigures must be used within ViewedFiguresProvider');
  return ctx;
}
