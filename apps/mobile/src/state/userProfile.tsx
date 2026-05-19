import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../shared';

const STORAGE_KEY = 'inspireme.userProfile.v1';

type Ctx = {
  loading: boolean;
  profile: UserProfile | null;
  saveProfile: (next: Omit<UserProfile, 'created_at'>) => Promise<void>;
  clearProfile: () => Promise<void>;
};

const UserProfileContext = createContext<Ctx | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch {
        // ignore — first launch or corrupted, fall through to onboarding.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProfile = useCallback(async (next: Omit<UserProfile, 'created_at'>) => {
    const full: UserProfile = { ...next, created_at: new Date().toISOString() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    setProfile(full);
  }, []);

  const clearProfile = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ loading, profile, saveProfile, clearProfile }),
    [loading, profile, saveProfile, clearProfile],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): Ctx {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
