import { create } from 'zustand';
import { api } from '@/lib/api';
import { invalidate } from '@/lib/query';
import { toast } from '@/stores/toast';
import { t } from '@/lib/i18n';

/** Status "Disukai" per lagu: dimuat batch untuk daftar yang tampil, diubah optimistis. */
interface LikesState {
  liked: Set<string>;
  known: Set<string>;
  check: (ids: string[]) => void;
  toggle: (id: string) => Promise<void>;
  reset: () => void;
}

let queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

export const useLikes = create<LikesState>((set, get) => ({
  liked: new Set(),
  known: new Set(),
  check(ids) {
    for (const id of ids) if (!get().known.has(id)) queue.add(id);
    if (!queue.size || timer) return;
    // Gabungkan permintaan dari beberapa daftar yang dirender bersamaan.
    timer = setTimeout(async () => {
      timer = null;
      const batch = [...queue].slice(0, 200);
      queue = new Set([...queue].slice(200));
      try {
        const r = await api<{ ids: string[] }>('/v1/library/likes/contains', { query: { ids: batch.join(',') } });
        const liked = new Set(get().liked);
        const known = new Set(get().known);
        for (const id of batch) {
          known.add(id);
          if (r.ids.includes(id)) liked.add(id);
        }
        set({ liked, known });
      } catch {
        /* tanpa login / offline: ikon hati tetap kosong */
      }
    }, 30);
  },
  async toggle(id) {
    const was = get().liked.has(id);
    const liked = new Set(get().liked);
    was ? liked.delete(id) : liked.add(id);
    set({ liked });
    try {
      await api(`/v1/library/likes/${id}`, { method: was ? 'DELETE' : 'PUT' });
      invalidate('/v1/library');
    } catch (e) {
      const back = new Set(get().liked);
      was ? back.add(id) : back.delete(id);
      set({ liked: back });
      toast.error((e as Error)?.message ?? t().common.offline);
    }
  },
  reset: () => set({ liked: new Set(), known: new Set() }),
}));
