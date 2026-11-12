import { useSettings } from '@/stores/settings';

const tag = () => (useSettings.getState().locale === 'en' ? 'en-US' : 'id-ID');

export const fmt = {
  duration(ms: number) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  },
  num: (n: number) => n.toLocaleString(tag()),
  compact: (n: number) => Intl.NumberFormat(tag(), { notation: 'compact' }).format(n),
  year: (iso: string) => iso?.slice(0, 4) ?? '',
  date: (iso: string) => new Date(iso).toLocaleDateString(tag(), { day: 'numeric', month: 'short', year: 'numeric' }),
  /** Total durasi daftar lagu: "1 j 12 mnt" / "42 mnt". */
  total(ms: number) {
    const min = Math.round(ms / 60000);
    const en = useSettings.getState().locale === 'en';
    if (min < 60) return `${min} ${en ? 'min' : 'mnt'}`;
    return `${Math.floor(min / 60)} ${en ? 'hr' : 'j'} ${min % 60} ${en ? 'min' : 'mnt'}`;
  },
};
