import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Quality = 'auto' | 'low' | 'normal' | 'high' | 'lossless';
export type Locale = 'id' | 'en';

/**
 * Server default: VITE_RAVE_API (build rilis wajib mengisinya) → server demo lokal (`./rave demo`, port 8080).
 * Dapat diganti pengguna di Pengaturan.
 */
export const DEFAULT_SERVER = (import.meta.env.VITE_RAVE_API as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8080';

/** Pilihan cepat server: `VITE_RAVE_API_PRESETS="Demo|http://…,Produksi|https://…"`; default selalu pertama. */
export const SERVER_PRESETS: { name: string; url: string }[] = (() => {
  const out = [{ name: 'Default', url: DEFAULT_SERVER }];
  for (const e of (import.meta.env.VITE_RAVE_API_PRESETS ?? '').split(',')) {
    const i = e.indexOf('|');
    const url = i > 0 ? normalizeServer(e.slice(i + 1)) : null;
    if (!url) continue;
    const name = e.slice(0, i).trim();
    const k = out.findIndex((p) => p.url === url);
    if (k >= 0) out[k] = { name, url };
    else out.push({ name, url });
  }
  return out;
})();

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
      // BRD (NFR lokalisasi): Bahasa Indonesia default; Inggris bila perangkat berbahasa Inggris.
      locale: navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'id',
      quality: 'auto',
      mediaKeys: true,
      setServer: (server) => set({ server: server.trim().replace(/\/+$/, '') }),
      setLocale: (locale) => set({ locale }),
      setQuality: (quality) => set({ quality }),
      setMediaKeys: (mediaKeys) => set({ mediaKeys }),
    }),
    {
      name: 'rave-desktop-settings',
      version: 1,
      // v0 (≤0.2.0) menyimpan default lama :8088 (produksi lokal, tertutup CORS untuk aplikasi) → pakai default baru.
      migrate: (state, from) => {
        const s = state as SettingsState;
        if (from < 1 && s.server === 'http://127.0.0.1:8088') s.server = DEFAULT_SERVER;
        return s;
      },
    },
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
