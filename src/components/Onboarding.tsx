import { useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { invalidate, useApi } from '@/lib/query';
import type { ArtistSummary, Me } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { Cover, cx } from '@/components/ui';

const CITIES = ['Jakarta', 'Bandung', 'Yogyakarta', 'Surabaya', 'Malang', 'Bali', 'Medan', 'Semarang', 'Makassar', 'Solo', 'Palembang', 'Lainnya'];
const FALLBACK_GENRES = ['indie-pop', 'folk', 'akustik', 'rock', 'post-punk', 'indie-rock', 'r-n-b', 'soul', 'shoegaze', 'dream-pop', 'hip-hop', 'pop', 'electronic', 'jazz', 'dangdut'];

/**
 * Onboarding selera (BRD IAM-02, sama dengan web /onboarding): kota → genre → min. 3 artis → POST /v1/me/onboarding.
 * Muncul sekali setelah masuk bila akun belum di-onboarding; bisa dilewati.
 */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const g = useApi<{ data: { id: string; name: string }[] }>('/v1/catalog/genres');
  const a = useApi<{ data: ArtistSummary[] }>('/v1/catalog/artists?limit=50');
  const genreList = g.data?.data?.length ? g.data.data : FALLBACK_GENRES.map((x) => ({ id: x, name: x }));
  const artistList = [...(a.data?.data ?? [])].sort((x, y) => Number(y.genres.some((z) => genres.includes(z))) - Number(x.genres.some((z) => genres.includes(z))));
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const ok = step === 0 ? !!city : step === 1 ? genres.length > 0 : artists.length >= 3;

  async function finish() {
    setBusy(true);
    try {
      const me = await api<Me>('/v1/me/onboarding', { body: { city, genres, artist_ids: artists } });
      useAuth.getState().setUser(me);
      invalidate('/v1/');
      toast.success(t.onboarding.done);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const titles = [t.onboarding.city, t.onboarding.genres, t.onboarding.artists];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={titles[step]}>
      <div className="rise grain flex max-h-full w-full max-w-[760px] flex-col border-2 border-ink bg-canvas shadow-[8px_8px_0_var(--color-mustard)]">
        <div className="flex items-center gap-2 px-8 pt-6">
          {[0, 1, 2].map((k) => (
            <span key={k} className={cx('h-1 flex-1 transition-colors', k <= step ? 'bg-mustard' : 'bg-line')} />
          ))}
          <button type="button" onClick={onClose} className="label ml-4 text-muted hover:text-paper">
            {t.onboarding.skip}
          </button>
        </div>
        <div className="px-8 pt-6">
          <p className="label text-mustard">0{step + 1} / 03</p>
          <h2 className="display mt-2 text-[44px]">{titles[step]}</h2>
          <p className="mt-1 text-sm text-muted">{step === 2 ? t.onboarding.picked(artists.length) : t.onboarding.hint}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          {step < 2 ? (
            <div className="flex flex-wrap gap-2.5">
              {(step === 0 ? CITIES.map((c) => ({ id: c, name: c })) : genreList).map((o) => {
                const on = step === 0 ? city === o.id : genres.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => (step === 0 ? setCity(o.id) : toggle(genres, setGenres, o.id))}
                    className={cx('label inline-flex items-center gap-1.5 border px-3.5 py-2.5 transition', on ? 'border-ink bg-mustard text-ink shadow-[3px_3px_0_#0b0a0c]' : 'border-line bg-raised text-paper hover:border-paper')}
                  >
                    {on && <Check className="size-3.5" />} {o.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4">
              {artistList.map((x) => {
                const on = artists.includes(x.id);
                return (
                  <button key={x.id} type="button" aria-pressed={on} onClick={() => toggle(artists, setArtists, x.id)} className="group flex flex-col items-center gap-2 text-center">
                    <span className={cx('relative rounded-full border-[3px] transition', on ? 'scale-95 border-mustard' : 'border-transparent group-hover:border-line')}>
                      <Cover src={x.image_url} round className="size-24" />
                      {on && (
                        <span className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border-2 border-ink bg-mustard text-ink">
                          <Check className="size-4" />
                        </span>
                      )}
                    </span>
                    <span className={cx('line-clamp-2 text-[13px] font-bold', on && 'text-mustard')}>{x.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-line px-8 py-5">
          <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            {t.onboarding.back}
          </button>
          <button type="button" className="btn-primary" disabled={!ok || busy} onClick={() => (step < 2 ? setStep(step + 1) : void finish())}>
            {busy ? '…' : step < 2 ? t.onboarding.next : t.onboarding.finish}
          </button>
        </div>
      </div>
    </div>
  );
}
