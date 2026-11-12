import { create } from 'zustand';

export interface Toast {
  id: number;
  tone: 'info' | 'error' | 'success';
  text: string;
}
interface ToastState {
  items: Toast[];
  push: (tone: Toast['tone'], text: string) => void;
  dismiss: (id: number) => void;
}
let seq = 0;
export const useToast = create<ToastState>((set, get) => ({
  items: [],
  push(tone, text) {
    const id = ++seq;
    // Pesan identik yang masih tampil tidak ditumpuk.
    if (get().items.some((t) => t.text === text)) return;
    set({ items: [...get().items.slice(-2), { id, tone, text }] });
    setTimeout(() => get().dismiss(id), tone === 'error' ? 6000 : 3500);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));
export const toast = {
  info: (t: string) => useToast.getState().push('info', t),
  success: (t: string) => useToast.getState().push('success', t),
  error: (t: string) => useToast.getState().push('error', t),
};
