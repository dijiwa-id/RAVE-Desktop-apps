import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { ArtistSummary, LibrarySummary, ReleaseSummary } from '@/lib/types';
import { useNav } from '@/stores/nav';
import { cx, Empty, GuestPrompt, Loadable, SkeletonCards } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { MediaCard } from '@/components/media';

type Tab = 'playlists' | 'artists' | 'albums';

export default function Library() {
  return useAuth((s) => s.accessToken) ? <LibraryInner /> : <GuestPrompt />;
}

function LibraryInner() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('playlists');
  const q = useApi<LibrarySummary>('/v1/library/summary');
  const ids = (k: 'followed_artists' | 'saved_releases') => (q.data?.[k] ?? []).slice(0, 200).join(',');
  const artists = useApi<{ data: ArtistSummary[] }>(tab === 'artists' && q.data?.followed_artists.length ? `/v1/catalog/artists?ids=${ids('followed_artists')}` : null);
  const albums = useApi<{ data: ReleaseSummary[] }>(tab === 'albums' && q.data?.saved_releases.length ? `/v1/catalog/releases?ids=${ids('saved_releases')}` : null);
  const go = useNav((s) => s.go);
  const tabs: [Tab, string][] = [
    ['playlists', t.library.playlists],
    ['artists', t.library.artists],
    ['albums', t.library.albums],
  ];

  return (
    <div className="pb-10">
      <div className="px-6 pt-2">
        <h1 className="display text-[56px]">{t.library.title}</h1>
        <div className="mt-4 flex gap-2" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('label px-3 py-2 transition', tab === k ? 'bg-paper text-ink' : 'bg-raised text-paper hover:bg-hover')}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Loadable loading={q.loading} error={q.error} onRetry={q.reload} skeleton={<SkeletonCards />}>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] px-3">
          {tab === 'playlists' && (
            <>
              <div role="button" tabIndex={0} onClick={() => go({ name: 'liked' })} onKeyDown={(e) => e.key === 'Enter' && go({ name: 'liked' })} className="group p-3 hover:bg-raised">
                <div className="grid aspect-square place-items-center bg-gradient-to-br from-purple via-plum to-berry">
                  <Heart className="size-14 fill-mustard text-mustard" />
                </div>
                <p className="mt-3 truncate font-bold">{t.nav.liked}</p>
                <p className="text-[13px] text-muted">{t.library.likedSub(q.data?.liked_count ?? 0)}</p>
              </div>
              {q.data?.playlists.map((p) => (
                <MediaCard key={p.id} item={{ id: p.id, kind: 'playlist', title: p.title, subtitle: `Playlist · ${p.track_count}`, image_url: p.cover_url, href: `/app/playlist/${p.id}` }} />
              ))}
            </>
          )}
          {tab === 'artists' && artists.data?.data.map((a) => <MediaCard key={a.id} item={{ id: a.slug, kind: 'artist', title: a.name, subtitle: t.kinds.artist, image_url: a.image_url, href: `/app/artist/${a.slug}` }} />)}
          {tab === 'albums' && albums.data?.data.map((r) => <MediaCard key={r.id} item={{ id: r.id, kind: 'release', title: r.title, subtitle: r.artist.name, image_url: r.cover_url, href: `/app/album/${r.id}` }} />)}
        </div>
        {((tab === 'artists' && !q.data?.followed_artists.length) || (tab === 'albums' && !q.data?.saved_releases.length)) && <Empty title={t.common.empty} />}
      </Loadable>
    </div>
  );
}
