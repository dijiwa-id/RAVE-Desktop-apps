import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { SearchResult } from '@/lib/types';
import { useNav } from '@/stores/nav';
import { trackToPlayable, usePlayer } from '@/stores/player';
import { Cover, Empty, Loadable, PlayButton } from '@/components/ui';
import { MediaCard, Shelf, TrackList } from '@/components/media';

export default function Search({ q }: { q?: string }) {
  const t = useT();
  const term = (q ?? '').trim();
  const r = useApi<SearchResult>(term ? `/v1/catalog/search?q=${encodeURIComponent(term)}` : null);
  const go = useNav((s) => s.go);
  const playQueue = usePlayer((s) => s.playQueue);

  if (!term)
    return (
      <div className="px-6 pt-10">
        <h1 className="display text-[56px]">{t.nav.search}</h1>
        <p className="mt-2 text-muted">{t.search.start}</p>
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {(['indie-pop', 'folk', 'rock', 'r-n-b', 'shoegaze', 'hip-hop', 'jazz', 'electronic'] as const).map((g, i) => (
            <button
              key={g}
              type="button"
              onClick={() => useNav.getState().replace({ name: 'search', q: g })}
              className="grain relative h-28 overflow-hidden p-4 text-left shadow-[3px_3px_0_#0b0a0c] transition hover:-translate-y-0.5"
              style={{ background: ['#5b2a6e', '#1f5c52', '#8a2f3f', '#2a1233', '#7a3e91', '#b98a00', '#1a8fb0', '#c0405a'][i] }}
            >
              <span className="display text-3xl">{g.replace(/-/g, ' ')}</span>
            </button>
          ))}
        </div>
      </div>
    );

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
