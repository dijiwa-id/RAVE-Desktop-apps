import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Quality = 'auto' | 'low' | 'normal' | 'high' | 'lossless';
export type Locale = 'id' | 'en';

/** Server default: VITE_RAVE_API (build) → produksi lokal. Dapat diganti pengguna di Pengaturan. */
export const DEFAULT_SERVER = (import.meta.env.VITE_RAVE_API as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8088';

interface SettingsState {
  server: string;
  locale: Locale;
  quality: Quality;
  mediaKeys: boolean;
  setServer: (url: string) => void;
  setLocale: (l: Locale) => void;
  setQuality: (q: Quality) => void;
  setMediaKeys: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      server: DEFAULT_SERVER,
      locale: navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en',
      quality: 'auto',
      mediaKeys: true,
      setServer: (server) => set({ server: server.trim().replace(/\/+$/, '') }),
      setLocale: (locale) => set({ locale }),
      setQuality: (quality) => set({ quality }),
      setMediaKeys: (mediaKeys) => set({ mediaKeys }),
    }),
    { name: 'rave-desktop-settings' },
  ),
);

/** Normalisasi & validasi URL server (http/https saja). */
export function normalizeServer(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin;
  } catch {
    return null;
  }
}
