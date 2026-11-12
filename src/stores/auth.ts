import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Me, TokenResponse } from '@/lib/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Me | null;
  setSession: (t: TokenResponse) => void;
  setUser: (u: Me) => void;
  clear: () => void;
}

// Token disimpan di penyimpanan WebView milik aplikasi (per pengguna OS). Rencana berikutnya: keychain OS via plugin.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (t) => set({ accessToken: t.access_token, refreshToken: t.refresh_token, user: t.user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'rave-desktop-auth' },
  ),
);
