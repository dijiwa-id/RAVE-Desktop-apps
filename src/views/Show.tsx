import { Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import { useApi } from '@/lib/query';
import type { Episode, Show as ShowData } from '@/lib/types';
import { usePlayer, type Playable } from '@/stores/player';
import { cx, Loadable, PlayButton } from '@/components/ui';
import { Dot, Hero } from '@/components/Hero';

export default function Show({ id }: { id: string }) {
  const t = useT();
  const q = useApi<ShowData>(`/v1/catalog/shows/${id}`);
  const { current, playing, playQueue, toggle } = usePlayer();
  const s = q.data;
  const eps = s?.episodes ?? [];
  const toPlayable = (e: Episode): Playable => ({ id: e.id, kind: 'episode', title: e.title, subtitle: s?.title ?? '', image_url: e.cover_url ?? s?.cover_url ?? null, duration_ms: e.duration_ms, premium: e.is_premium, content_warning: !!s?.content_warning });
  const playAt = (i: number) => (current?.id === eps[i].id ? toggle() : void playQueue(eps.map(toPlayable), i));

  return (
    <Loadable loading={q.loading} error={q.error} onRetry={q.reload}>
      {s && (
        <div className="pb-10">
          <Hero
            kind={t.kinds.show}
            title={s.title}
            image={s.cover_url}
            tint="from-berry/80"
            meta={
              <>
                <span className="font-bold">{s.publisher}</span>
                <Dot />
                <span>{s.category}</span>
                <Dot />
                <span>
                  {eps.length} {t.common.episodes}
                </span>
              </>
            }
          >
            {eps.length > 0 && <PlayButton size="lg" label={t.common.play} playing={eps.some((e) => e.id === current?.id) && playing} onClick={() => playAt(0)} />}
          </Hero>
          {s.description && <p className="selectable max-w-3xl px-6 pb-4 leading-relaxed text-paper/85">{s.description}</p>}
          <ul className="px-4">
            {eps.map((e, i) => {
              const cur = current?.id === e.id;
              return (
                <li key={e.id} className="group flex items-start gap-4 border-t border-line p-3 hover:bg-raised">
                  <div className="min-w-0 flex-1">
                    <p className={cx('font-bold', cur && 'text-mustard')}>
                      {e.title} {e.is_premium && <Lock className="ml-1 inline size-3.5 text-mustard" aria-label={t.common.premium} />}
                    </p>
                    {e.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{e.description}</p>}
                    <p className="label mt-2 text-subtle">
                      {fmt.date(e.published_at)} · {fmt.total(e.duration_ms)}
                    </p>
                  </div>
                  <PlayButton size="sm" label={`${t.common.play} ${e.title}`} playing={cur && playing} onClick={() => playAt(i)} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Loadable>
  );
}
