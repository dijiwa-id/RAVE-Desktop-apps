import { useState } from 'react';
import { CircleCheck, CirclePlus, Shuffle } from 'lucide-react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import { invalidate, useApi } from '@/lib/query';
import type { LibrarySummary, Release } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { useNav } from '@/stores/nav';
import { trackToPlayable, usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';
import { IconButton, Loadable, PlayButton } from '@/components/ui';
import { Dot, Hero } from '@/components/Hero';
import { TrackList } from '@/components/media';

export default function Album({ id }: { id: string }) {
  const t = useT();
  const q = useApi<Release>(`/v1/catalog/releases/${id}`);
  const authed = !!useAuth((s) => s.accessToken);
  const lib = useApi<LibrarySummary>(authed ? '/v1/library/summary' : null);
  const { current, playing, playQueue, toggle, toggleShuffle, shuffle } = usePlayer();
  const go = useNav((s) => s.go);
  const [busy, setBusy] = useState(false);
  const r = q.data;
  const saved = !!r && !!lib.data?.saved_releases.includes(r.id);
  const inThis = !!r && !!current && r.tracks.some((x) => x.id === current.id);

  async function save() {
    if (!r) return;
    setBusy(true);
    try {
      await api(`/v1/library/releases/${r.id}`, { method: saved ? 'DELETE' : 'PUT' });
      invalidate('/v1/library');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Loadable loading={q.loading} error={q.error} onRetry={q.reload}>
      {r && (
        <div className="pb-10">
          <Hero
            kind={t.kinds[r.type] ?? t.kinds.release}
            title={r.title}
            image={r.cover_url}
            meta={
              <>
                <button type="button" onClick={() => go({ name: 'artist', id: r.artist.slug })} className="font-bold hover:underline">
                  {r.artist.name}
                </button>
                <Dot />
                <span>{fmt.year(r.release_date)}</span>
                <Dot />
                <span>
                  {t.common.songs(r.tracks.length)}, {fmt.total(r.tracks.reduce((s, x) => s + x.duration_ms, 0))}
                </span>
              </>
            }
          >
            <PlayButton size="lg" label={t.common.play} playing={inThis && playing} onClick={() => (inThis ? toggle() : void playQueue(r.tracks.map(trackToPlayable)))} />
            <IconButton label={t.common.shuffle} active={shuffle} onClick={toggleShuffle} className="size-10">
              <Shuffle className="size-6" />
            </IconButton>
            {authed && (
              <IconButton label={saved ? t.common.saved : t.common.save} active={saved} onClick={() => void save()} disabled={busy} className="size-10">
                {saved ? <CircleCheck className="size-7" /> : <CirclePlus className="size-7" />}
              </IconButton>
            )}
          </Hero>
          <TrackList tracks={r.tracks} showAlbum={false} showCover={false} context={r.title} />
          <p className="label mt-8 px-10 text-subtle">
            {fmt.date(r.release_date)}
            {r.label ? ` · ℗ ${r.label}` : ''}
          </p>
        </div>
      )}
    </Loadable>
  );
}
