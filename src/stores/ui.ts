import { create } from 'zustand';

/** Status UI global: modal Masuk/Daftar (aplikasi tetap dipakai sebagai tamu). */
interface UiState {
  auth: null | 'login' | 'signup';
  openAuth: (mode?: 'login' | 'signup') => void;
  closeAuth: () => void;
}
export const useUi = create<UiState>((set) => ({
  auth: null,
  openAuth: (mode = 'login') => set({ auth: mode }),
  closeAuth: () => set({ auth: null }),
}));
