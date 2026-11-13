import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { Show } from '@/lib/types';
import { useNav } from '@/stores/nav';
import { cx, Empty, Loadable, SkeletonCards } from '@/components/ui';
import { MediaCard } from '@/components/media';

/** Podcast / Cerita & Fiksi Audio (`GET /v1/catalog/shows?kind=`) — tujuan tile Jelajahi, setara web /app/podcasts. */
export default function Podcasts({ kind = 'PODCAST' }: { kind?: 'PODCAST' | 'FICTION' }) {
  const t = useT();
  const replace = useNav((s) => s.replace);
  const q = useApi<{ data: Show[] }>(`/v1/catalog/shows?kind=${kind}`);
  return (
    <div className="pb-10">
      <div className="grain -mt-16 bg-gradient-to-b from-teal/80 via-teal/20 to-transparent px-6 pt-24 pb-6">
        <h1 className="display text-[72px] leading-none">{kind === 'PODCAST' ? t.browse.podcast : t.browse.stories}</h1>
        <div role="tablist" className="mt-5 flex gap-2">
          {(['PODCAST', 'FICTION'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => replace({ name: 'podcasts', kind: k })}
              className={cx('label px-4 py-2 transition-colors', kind === k ? 'bg-paper text-ink' : 'bg-paper/10 text-paper hover:bg-paper/20')}
            >
              {k === 'PODCAST' ? t.browse.podcast : t.browse.stories}
            </button>
          ))}
        </div>
      </div>
      <Loadable loading={q.loading} error={q.error} onRetry={q.reload} skeleton={<SkeletonCards n={10} />}>
        {q.data && !q.data.data.length ? (
          <Empty title={t.browse.empty} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] px-3">
            {q.data?.data.map((s) => (
              <MediaCard key={s.id} item={{ id: s.id, kind: 'show', title: s.title, subtitle: s.publisher, image_url: s.cover_url, href: `/app/show/${s.id}` }} />
            ))}
          </div>
        )}
      </Loadable>
    </div>
  );
}
