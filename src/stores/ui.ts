import { create } from 'zustand';

/**
 * Status UI global: modal Masuk/Daftar (aplikasi tetap dipakai sebagai tamu). IAM RAVE hanya OTP email — masuk dan
 * daftar adalah SATU alur (akun dibuat otomatis saat kode diverifikasi), jadi hanya ada satu pintu masuk.
 */
interface UiState {
  auth: boolean;
  openAuth: () => void;
  closeAuth: () => void;
}
export const useUi = create<UiState>((set) => ({
  auth: false,
  openAuth: () => set({ auth: true }),
  closeAuth: () => set({ auth: false }),
}));
