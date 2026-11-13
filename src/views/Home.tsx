import { MapPin } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { openExternal } from '@/lib/native';
import { useApi } from '@/lib/query';
import type { Home as HomeData, MediaItem, Track } from '@/lib/types';
import { useSettings } from '@/stores/settings';
import { useAuth } from '@/stores/auth';
import { useNav } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';
import { Cover, Loadable, PlayButton, SkeletonCards } from '@/components/ui';
import { MediaCard, playablesOf, routeOf, Shelf } from '@/components/media';
import { LiveCard, useLiveEnabled, useLiveStreams } from '@/components/live';

function greeting(t: ReturnType<typeof useT>) {
  const h = new Date().getHours();
  return h < 11 ? t.greet.morning : h < 15 ? t.greet.afternoon : h < 19 ? t.greet.evening : t.greet.night;
}

export default function Home() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const city = user?.city ?? null;
  const cityQ = city ? `?city=${encodeURIComponent(city)}` : '';
  // Sumber data sama dengan beranda web (apps/web pages/fan/Home.tsx): feed katalog per kota, riwayat dengar,
  // playlist editorial RAVE, dan event terdekat.
  const q = useApi<HomeData>(`/v1/catalog/home${cityQ}`);
  const history = useApi<{ data: (Track & { played_at: string })[] }>(user ? '/v1/library/history' : null);
  const featured = useApi<{ data: Playlist[] }>('/v1/library/playlists/featured');
  const events = useApi<{ data: EventSummary[] }>(`/v1/ticketing/events?limit=10${city ? `&city=${encodeURIComponent(city)}` : ''}`);
  const liveOn = useLiveEnabled();
  const live = useLiveStreams('live', 8, 60_000, liveOn);
  const go = useNav((n) => n.go);
  const recent = [...new Map((history.data?.data ?? []).map((x) => [x.id, x])).values()].slice(0, 12);
  return (
    <div className="pb-10">
      <div className="grain bg-gradient-to-b from-purple/70 via-plum/40 to-transparent px-6 pt-2 pb-6">
        <p className="label text-mustard">RAVE · {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</p>
        <h1 className="display mt-2 text-[56px]">
          {greeting(t)}
          {user ? `, ${user.display_name.split(' ')[0]}` : ''}
        </h1>
        {!user && <p className="mt-3 max-w-2xl text-sm text-paper/85">{t.guest.banner}</p>}
        <Loadable loading={q.loading} error={q.error} onRetry={q.reload} skeleton={<div className="mt-6 h-40 animate-pulse bg-raised/40" />}>
          <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {q.data?.quick_picks.map((it) => <QuickPick key={it.kind + it.id} item={it} />)}
          </div>
        </Loadable>
      </div>
      {!!live.data?.data.length && (
        <section className="mt-2">
          <div className="mb-1 flex items-end justify-between px-6">
            <h2 className="display flex items-center gap-2 text-[28px] leading-none">
              <span className="size-2.5 animate-pulse rounded-full bg-red-500" aria-hidden /> {t.live.liveNow}
            </h2>
            <button type="button" onClick={() => go({ name: 'live' })} className="label text-muted hover:text-paper">
              {t.live.seeAll}
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] px-3">
            {live.data.data.slice(0, 4).map((s) => (
              <LiveCard key={s.id} s={s} />
            ))}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <Shelf title={t.home.recentlyPlayed}>
          {recent.map((x) => (
            <MediaCard key={x.id} item={{ id: x.id, kind: 'track', title: x.title, subtitle: x.artist.name, image_url: x.release.cover_url, href: '' }} />
          ))}
        </Shelf>
      )}
      <Loadable loading={q.loading} error={null} onRetry={q.reload} skeleton={<SkeletonCards n={12} />}>
        {q.data?.sections
          .filter((s) => s.items.length)
          .map((s) => (
            <Shelf key={s.id} title={s.title}>
              {s.items.slice(0, 12).map((it) => (
                <MediaCard key={it.kind + it.id} item={it} subtitle={it.kind === 'artist' ? t.kinds.artist : undefined} />
              ))}
            </Shelf>
          ))}
      </Loadable>
      {!!featured.data?.data.length && (
        <Shelf title={t.home.featured}>
          {featured.data.data.slice(0, 12).map((p) => (
            <MediaCard key={p.id} item={{ id: p.id, kind: 'playlist', title: p.title, subtitle: p.description ?? t.home.songs(p.track_count), image_url: p.cover_url, href: `/app/playlist/${p.id}` }} />
          ))}
        </Shelf>
      )}
      {!!events.data?.data.length && (
        <Shelf title={city ? t.home.nearYou(city) : t.home.events}>
          {events.data.data.slice(0, 12).map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </Shelf>
      )}
    </div>
  );
}

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  track_count: number;
}
interface EventSummary {
  id: string;
  slug: string;
  title: string;
  poster_url: string | null;
  city: string;
  venue_name: string;
  starts_at: string;
}

/** Kartu event: tiket dibeli di web RAVE (checkout & QR tiket belum ada di aplikasi desktop). */
function EventCard({ e }: { e: EventSummary }) {
  const t = useT();
  const server = useSettings((s) => s.server);
  const open = () => void openExternal(`${server}/app/events/${encodeURIComponent(e.slug)}`);
  return (
    <div role="button" tabIndex={0} title={t.home.ticketsOnWeb} onClick={open} onKeyDown={(k) => k.key === 'Enter' && open()} className="group min-w-0 p-3 transition-colors hover:bg-raised focus-visible:bg-raised">
      <Cover src={e.poster_url} className="aspect-square w-full shadow-[0_8px_24px_rgb(0_0_0/0.45)]" />
      <p className="label mt-3 text-mustard">{new Date(e.starts_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      <p className="mt-0.5 truncate font-bold">{e.title}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
        <MapPin className="size-3 shrink-0" />
        {e.venue_name ? `${e.venue_name}, ${e.city}` : e.city}
      </p>
    </div>
  );
}

/** Tile cepat bergaya kliping: sampul kecil + judul, tombol putar muncul saat hover. */
function QuickPick({ item }: { item: MediaItem }) {
  const t = useT();
  const go = useNav((s) => s.go);
  const playQueue = usePlayer((s) => s.playQueue);
  const route = routeOf(item);
  const play = async () => {
    try {
      const items = await playablesOf(item);
      if (items.length) await playQueue(items, 0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => (route ? go(route) : void play())}
      onKeyDown={(e) => e.key === 'Enter' && (route ? go(route) : void play())}
      className="group flex h-16 items-center gap-3 overflow-hidden bg-paper/10 pr-3 transition-colors hover:bg-paper/20"
    >
      <Cover src={item.image_url} round={item.kind === 'artist'} className="size-16" />
      <span className="min-w-0 flex-1 truncate font-bold">{item.title}</span>
      <span className="opacity-0 transition group-hover:opacity-100">
        <PlayButton size="sm" label={`${t.common.play} ${item.title}`} onClick={() => void play()} />
      </span>
    </div>
  );
}
