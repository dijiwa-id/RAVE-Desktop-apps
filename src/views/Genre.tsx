import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { BrowseCategory } from '@/lib/types';
import { Empty, Loadable, SkeletonCards } from '@/components/ui';
import { MediaCard, Shelf, TrackList } from '@/components/media';

interface FeaturedPlaylist {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  track_count: number;
}

/** Halaman kategori/genre dari tile Jelajahi — `GET /v1/catalog/browse/:id` + playlist editorial bertag (setara web Genre). */
export default function Genre({ id }: { id: string }) {
  const t = useT();
  const b = useApi<BrowseCategory>(`/v1/catalog/browse/${encodeURIComponent(id)}`);
  const pl = useApi<{ data: FeaturedPlaylist[] }>(`/v1/library/playlists/featured?tag=${encodeURIComponent(id)}`);
  const d = b.data;
  const title = d?.category.name ?? id.replace(/-/g, ' ');
  const color = d?.category.color ?? '#5b2a6e';
  const empty = d && !d.artists.length && !d.releases.length && !d.tracks.length && !pl.data?.data.length;
  return (
    <div className="pb-10">
      <div className="grain -mt-16 px-6 pt-24 pb-8" style={{ background: `linear-gradient(to bottom, ${color}cc, ${color}33 70%, transparent)` }}>
        <p className="label text-paper/80">{t.browse.title}</p>
        <h1 className="display mt-2 text-[72px] leading-none">{title}</h1>
      </div>
      <Loadable loading={b.loading} error={b.error} onRetry={b.reload} skeleton={<SkeletonCards n={6} />}>
        {!!pl.data?.data.length && (
          <Shelf title={t.browse.playlists}>
            {pl.data.data.map((p) => (
              <MediaCard key={p.id} item={{ id: p.id, kind: 'playlist', title: p.title, subtitle: p.description ?? t.home.songs(p.track_count), image_url: p.cover_url, href: `/app/playlist/${p.id}` }} />
            ))}
          </Shelf>
        )}
        {!!d?.artists.length && (
          <Shelf title={t.search.artists}>
            {d.artists.map((a) => (
              <MediaCard key={a.id} item={{ id: a.slug, kind: 'artist', title: a.name, subtitle: a.city ?? t.kinds.artist, image_url: a.image_url, href: `/app/artist/${a.slug}` }} />
            ))}
          </Shelf>
        )}
        {!!d?.releases.length && (
          <Shelf title={t.browse.releases}>
            {d.releases.map((r) => (
              <MediaCard key={r.id} item={{ id: r.id, kind: 'release', title: r.title, subtitle: `${r.release_date?.slice(0, 4) ?? ''} · ${r.artist.name}`, image_url: r.cover_url, href: `/app/album/${r.id}` }} />
            ))}
          </Shelf>
        )}
        {!!d?.tracks.length && (
          <section className="mt-8">
            <h2 className="display mb-3 px-6 text-[28px] leading-none">{t.browse.popular}</h2>
            <TrackList tracks={d.tracks} context={t.browse.popular} />
          </section>
        )}
        {empty && <Empty title={t.browse.empty} />}
      </Loadable>
    </div>
  );
}
