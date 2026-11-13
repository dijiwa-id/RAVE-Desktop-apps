import { media } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { openExternal } from '@/lib/native';
import { usePlatform } from '@/lib/platform';
import { useApi } from '@/lib/query';
import type { Category, SearchResult } from '@/lib/types';
import { routeFromHref, useNav } from '@/stores/nav';
import { useSettings } from '@/stores/settings';
import { trackToPlayable, usePlayer } from '@/stores/player';
import { Cover, Empty, Loadable, PlayButton } from '@/components/ui';
import { MediaCard, Shelf, TrackList } from '@/components/media';

export default function Search({ q }: { q?: string }) {
  const t = useT();
  const term = (q ?? '').trim();
  const r = useApi<SearchResult>(term ? `/v1/catalog/search?q=${encodeURIComponent(term)}` : null);
  const go = useNav((s) => s.go);
  const playQueue = usePlayer((s) => s.playQueue);

  if (!term) return <Browse />;

  const d = r.data;
  const top = d?.artists[0];
  const empty = d && !d.artists.length && !d.tracks.length && !d.releases.length && !d.shows.length;

  return (
    <Loadable loading={r.loading} error={r.error} onRetry={r.reload}>
      {empty ? (
        <Empty title={t.search.none(term)} />
      ) : (
        d && (
          <div className="pb-10">
            <div className="grid gap-6 px-6 pt-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {top && (
                <section>
                  <h2 className="display mb-3 text-[28px]">{t.search.top}</h2>
                  <div role="button" tabIndex={0} onClick={() => go({ name: 'artist', id: top.slug })} onKeyDown={(e) => e.key === 'Enter' && go({ name: 'artist', id: top.slug })} className="group relative bg-raised p-5 transition-colors hover:bg-hover">
                    <Cover src={top.image_url} round className="size-24 shadow-[0_8px_24px_rgb(0_0_0/0.5)]" />
                    <p className="display mt-5 text-[40px]">{top.name}</p>
                    <p className="label mt-2 text-muted">{t.kinds.artist}</p>
                    <div className="absolute right-5 bottom-5 opacity-0 transition group-hover:opacity-100">
                      <PlayButton
                        label={`${t.common.play} ${top.name}`}
                        onClick={() => d.tracks.length && void playQueue(d.tracks.filter((x) => x.artist.id === top.id).map(trackToPlayable))}
                      />
                    </div>
                  </div>
                </section>
              )}
              {d.tracks.length > 0 && (
                <section className="min-w-0">
                  <h2 className="display mb-1 text-[28px]">{t.search.songs}</h2>
                  <div className="-mx-4">
                    <TrackList tracks={d.tracks.slice(0, 5)} showAlbum={false} numbered={false} context={t.search.songs} />
                  </div>
                </section>
              )}
            </div>
            {d.artists.length > 0 && (
              <Shelf title={t.search.artists}>
                {d.artists.map((a) => (
                  <MediaCard key={a.id} item={{ id: a.slug, kind: 'artist', title: a.name, subtitle: t.kinds.artist, image_url: a.image_url, href: `/app/artist/${a.slug}` }} />
                ))}
              </Shelf>
            )}
            {d.releases.length > 0 && (
              <Shelf title={t.search.albums}>
                {d.releases.map((x) => (
                  <MediaCard key={x.id} item={{ id: x.id, kind: 'release', title: x.title, subtitle: `${x.release_date.slice(0, 4)} · ${x.artist.name}`, image_url: x.cover_url, href: `/app/album/${x.id}` }} />
                ))}
              </Shelf>
            )}
            {d.shows.length > 0 && (
              <Shelf title={t.search.podcasts}>
                {d.shows.map((s) => (
                  <MediaCard key={s.id} item={{ id: s.id, kind: 'show', title: s.title, subtitle: s.publisher, image_url: s.cover_url, href: `/app/show/${s.id}` }} />
                ))}
              </Shelf>
            )}
          </div>
        )
      )}
    </Loadable>
  );
}

/** Jelajahi semua — tile kategori dari server (`GET /v1/catalog/browse`), sama persis dengan web /app/search. */
function Browse() {
  const t = useT();
  const q = useApi<{ data: Category[] }>('/v1/catalog/browse');
  const podcasts = usePlatform()('modules.podcasts', true);
  const list = (q.data?.data ?? []).filter((c) => podcasts || !c.href.startsWith('/app/podcasts'));
  return (
    <div className="px-6 pt-2 pb-10">
      <h1 className="display text-[56px]">{t.browse.title}</h1>
      <p className="mt-1 text-muted">{t.search.start}</p>
      <Loadable
        loading={q.loading}
        error={q.error}
        onRetry={q.reload}
        skeleton={
          <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-5">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse bg-raised" />
            ))}
          </div>
        }
      >
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-5">
          {list.map((c) => (
            <CategoryTile key={c.id} c={c} />
          ))}
        </div>
      </Loadable>
    </div>
  );
}

function CategoryTile({ c }: { c: Category }) {
  const t = useT();
  const go = useNav((s) => s.go);
  const server = useSettings((s) => s.server);
  const route = routeFromHref(c.href);
  // Rute yang belum ada di desktop (event & tiket) dibuka di web RAVE.
  const open = () => (route ? go(route) : void openExternal(server + c.href));
  const img = media(c.image_url);
  return (
    <button
      type="button"
      onClick={open}
      title={route ? c.name : t.browse.eventsOnWeb}
      className="grain relative aspect-[4/3] overflow-hidden p-4 text-left shadow-[3px_3px_0_#0b0a0c] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0b0a0c] focus-visible:-translate-y-0.5"
      style={{ background: c.color }}
    >
      <span className="display relative z-10 block text-[28px] leading-none break-words text-white">{c.name}</span>
      {img && <img src={img} alt="" loading="lazy" decoding="async" className="absolute -right-3 -bottom-2 size-[46%] rotate-[25deg] object-cover shadow-[0_4px_12px_rgb(0_0_0/0.4)]" />}
    </button>
  );
}
