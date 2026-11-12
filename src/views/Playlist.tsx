import { Heart, Shuffle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import { useApi } from '@/lib/query';
import type { Playlist as PlaylistData, Track } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { trackToPlayable, usePlayer } from '@/stores/player';
import { Empty, IconButton, Loadable, PlayButton } from '@/components/ui';
import { Dot, Hero } from '@/components/Hero';
import { TrackList } from '@/components/media';

/** Satu komponen untuk playlist dan "Lagu yang Disukai" (sumber data berbeda, tampilan sama). */
export default function Playlist({ id }: { id: string | 'liked' }) {
  const t = useT();
  const liked = id === 'liked';
  const pl = useApi<PlaylistData>(liked ? null : `/v1/library/playlists/${id}`);
  const lk = useApi<{ data: Track[] }>(liked ? '/v1/library/likes' : null);
  const user = useAuth((s) => s.user);
  const q = liked ? lk : pl;
  const tracks: Track[] = liked ? (lk.data?.data ?? []) : (pl.data?.items.map((x) => x.track) ?? []);
  const { current, playing, playQueue, toggle, toggleShuffle, shuffle } = usePlayer();
  const inThis = !!current && tracks.some((x) => x.id === current.id);
  const title = liked ? t.nav.liked : (pl.data?.title ?? '');

  return (
    <Loadable loading={q.loading} error={q.error} onRetry={q.reload}>
      {(liked || pl.data) && (
        <div className="pb-10">
          <Hero
            kind="Playlist"
            title={title}
            image={liked ? undefined : pl.data?.cover_url}
            tint={liked ? 'from-purple' : 'from-teal/80'}
            art={
              liked ? (
                <div className="grid size-[200px] place-items-center bg-gradient-to-br from-purple via-plum to-berry shadow-[0_16px_48px_rgb(0_0_0/0.55)] xl:size-[232px]">
                  <Heart className="size-20 fill-mustard text-mustard" />
                </div>
              ) : undefined
            }
            meta={
              <>
                {!liked && pl.data?.description && <p className="w-full pb-1 text-muted">{pl.data.description}</p>}
                <span className="font-bold">{liked ? user?.display_name : (pl.data?.owner?.display_name ?? pl.data?.owner?.name ?? 'RAVE')}</span>
                <Dot />
                <span>
                  {t.common.songs(tracks.length)}
                  {tracks.length ? `, ${fmt.total(tracks.reduce((s, x) => s + x.duration_ms, 0))}` : ''}
                </span>
              </>
            }
          >
            <PlayButton size="lg" label={t.common.play} playing={inThis && playing} onClick={() => (inThis ? toggle() : void playQueue(tracks.map(trackToPlayable)))} />
            <IconButton label={t.common.shuffle} active={shuffle} onClick={toggleShuffle} className="size-10">
              <Shuffle className="size-6" />
            </IconButton>
          </Hero>
          {tracks.length ? <TrackList tracks={tracks} numbered={false} context={title} /> : <Empty title={t.common.empty} />}
        </div>
      )}
    </Loadable>
  );
}
