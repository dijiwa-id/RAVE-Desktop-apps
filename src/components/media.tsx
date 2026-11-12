import { useEffect, useRef, type ReactNode } from 'react';
import { Heart, ListPlus } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import type { MediaItem, Track } from '@/lib/types';
import { routeFromHref, useNav, type Route } from '@/stores/nav';
import { trackToPlayable, usePlayer, type Playable } from '@/stores/player';
import { useLikes } from '@/stores/likes';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { api } from '@/lib/api';
import { Cover, cx, PlayButton } from '@/components/ui';

/** Muat item yang bisa diputar dari sebuah kartu (album/artis/playlist/episode). */
export async function playablesOf(item: { id: string; kind: string }): Promise<Playable[]> {
  if (item.kind === 'release') return (await api<{ tracks: Track[] }>(`/v1/catalog/releases/${item.id}`)).tracks.map(trackToPlayable);
  if (item.kind === 'artist') return (await api<{ top_tracks: Track[] }>(`/v1/catalog/artists/${item.id}`)).top_tracks.map(trackToPlayable);
  if (item.kind === 'playlist') return (await api<{ items: { track: Track }[] }>(`/v1/library/playlists/${item.id}`)).items.map((x) => trackToPlayable(x.track));
  if (item.kind === 'track') return [trackToPlayable(await api<Track>(`/v1/catalog/tracks/${item.id}`))];
  if (item.kind === 'episode') {
    const e = await api<{ id: string; title: string; duration_ms: number; cover_url: string | null; is_premium: boolean; show_id: string; show?: { title: string } }>(`/v1/catalog/episodes/${item.id}`);
    return [{ id: e.id, kind: 'episode', title: e.title, subtitle: e.show?.title ?? '', image_url: e.cover_url, duration_ms: e.duration_ms, premium: e.is_premium }];
  }
  return [];
}

export function routeOf(item: MediaItem): Route | null {
  if (item.kind === 'episode') return null;
  return routeFromHref(item.href) ?? (item.kind === 'release' ? { name: 'album', id: item.id } : item.kind === 'artist' ? { name: 'artist', id: item.id } : null);
}

/** Kartu media (album, artis, playlist, podcast) dengan tombol putar yang muncul saat hover. */
export function MediaCard({ item, subtitle }: { item: MediaItem; subtitle?: string }) {
  const t = useT();
  const go = useNav((s) => s.go);
  const playQueue = usePlayer((s) => s.playQueue);
  const round = item.kind === 'artist';
  const route = routeOf(item);
  async function play() {
    try {
      const items = await playablesOf(item);
      if (items.length) await playQueue(items, 0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => (route ? go(route) : void play())}
      onKeyDown={(e) => e.key === 'Enter' && (route ? go(route) : void play())}
      className="group relative min-w-0 p-3 transition-colors hover:bg-raised focus-visible:bg-raised"
    >
      <div className="relative">
        <Cover src={item.image_url} round={round} className={cx('aspect-square w-full', !round && 'shadow-[0_8px_24px_rgb(0_0_0/0.45)]')} />
        {item.kind !== 'show' && (
          <div className="absolute right-2 bottom-2 translate-y-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100">
            <PlayButton label={`${t.common.play} ${item.title}`} onClick={() => void play()} />
          </div>
        )}
      </div>
      <p className="mt-3 truncate font-bold">{item.title}</p>
      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{subtitle ?? item.subtitle}</p>
    </div>
  );
}

export function Shelf({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-8 first:mt-2">
      <div className="mb-1 flex items-end justify-between px-6">
        <h2 className="display text-[28px] leading-none">{title}</h2>
        {action}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] px-3">{children}</div>
    </section>
  );
}

/** Daftar lagu: klik ganda / Enter untuk memutar, indikator lagu yang sedang diputar, suka, tambah antrean. */
export function TrackList({ tracks, showAlbum = true, showCover = true, numbered = true, context }: { tracks: Track[]; showAlbum?: boolean; showCover?: boolean; numbered?: boolean; context?: string }) {
  const t = useT();
  const { current, playing, playQueue, toggle, addToQueue } = usePlayer();
  const liked = useLikes((s) => s.liked);
  const check = useLikes((s) => s.check);
  const toggleLike = useLikes((s) => s.toggle);
  const authed = !!useAuth((s) => s.accessToken);
  const go = useNav((s) => s.go);
  const list = useRef<Playable[]>([]);
  list.current = tracks.map(trackToPlayable);
  useEffect(() => {
    if (authed && tracks.length) check(tracks.map((x) => x.id));
  }, [authed, tracks, check]);

  const play = (i: number) => (current?.id === tracks[i].id ? toggle() : void playQueue(list.current, i));
  const grid = showAlbum ? 'grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem]' : 'grid-cols-[2.5rem_minmax(0,1fr)_7rem]';

  return (
    <div role="table" aria-label={context} className="px-4">
      <div role="row" className={cx('grid items-center gap-4 border-b border-line px-3 pb-2 text-subtle', grid)}>
        <span className="label text-center">#</span>
        <span className="label">{t.common.title}</span>
        {showAlbum && <span className="label">{t.common.album}</span>}
        <span className="label pr-2 text-right">{t.common.duration}</span>
      </div>
      <div className="mt-2">
        {tracks.map((tr, i) => {
          const isCur = current?.id === tr.id;
          return (
            <div
              key={tr.id + i}
              role="row"
              tabIndex={0}
              aria-current={isCur || undefined}
              onDoubleClick={() => play(i)}
              onKeyDown={(e) => e.key === 'Enter' && play(i)}
              className={cx('group grid h-14 items-center gap-4 px-3 transition-colors hover:bg-raised focus-visible:bg-raised', grid, isCur && 'bg-raised/60')}
            >
              <div className="relative grid place-items-center text-muted tabular-nums">
                <span className={cx('group-hover:invisible', isCur && 'invisible')}>{numbered ? tr.track_number || i + 1 : i + 1}</span>
                {isCur && !playing ? null : isCur ? (
                  <span className="eq absolute group-hover:invisible" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`${isCur && playing ? t.common.pause : t.common.play} ${tr.title}`}
                  onClick={() => play(i)}
                  className={cx('absolute inset-0 grid place-items-center text-paper', isCur && !playing ? 'visible' : 'invisible group-hover:visible')}
                >
                  <PlayGlyph playing={isCur && playing} />
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                {showCover && <Cover src={tr.release.cover_url} className="size-10" />}
                <div className="min-w-0">
                  <p className={cx('truncate font-semibold', isCur && 'text-mustard')}>{tr.title}</p>
                  <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
                    {tr.explicit && <span className="grid size-4 shrink-0 place-items-center bg-muted text-[9px] font-bold text-ink">E</span>}
                    <button type="button" onClick={() => go({ name: 'artist', id: tr.artist.slug })} className="truncate hover:text-paper hover:underline">
                      {tr.artist.name}
                    </button>
                  </p>
                </div>
              </div>
              {showAlbum && (
                <button type="button" onClick={() => go({ name: 'album', id: tr.release.id })} className="truncate text-left text-[13px] text-muted hover:text-paper hover:underline">
                  {tr.release.title}
                </button>
              )}
              <div className="flex items-center justify-end gap-1 text-muted">
                {authed && (
                  <button
                    type="button"
                    aria-label={liked.has(tr.id) ? t.common.unlike : t.common.like}
                    aria-pressed={liked.has(tr.id)}
                    onClick={() => void toggleLike(tr.id)}
                    className={cx('grid size-7 place-items-center hover:text-paper', liked.has(tr.id) ? 'text-mustard' : 'invisible group-hover:visible')}
                  >
                    <Heart className={cx('size-4', liked.has(tr.id) && 'fill-current')} />
                  </button>
                )}
                <span className="w-11 text-right text-[13px] tabular-nums">{fmt.duration(tr.duration_ms)}</span>
                <button
                  type="button"
                  aria-label={t.common.addQueue}
                  title={t.common.addQueue}
                  onClick={() => {
                    addToQueue(list.current[i]);
                    toast.info(`${t.common.addQueue}: ${tr.title}`);
                  }}
                  className="invisible grid size-7 place-items-center hover:text-paper group-hover:visible"
                >
                  <ListPlus className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayGlyph({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <rect x="3" y="2" width="3.5" height="12" />
      <rect x="9.5" y="2" width="3.5" height="12" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}

