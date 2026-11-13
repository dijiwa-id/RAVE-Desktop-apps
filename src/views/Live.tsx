import { useEffect, useState, type ReactNode } from 'react';
import { MessageCircle, Radio } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useNav } from '@/stores/nav';
import { Empty, Loadable } from '@/components/ui';
import { LiveCard, LivePlayer, useLiveEnabled, useLiveStreams } from '@/components/live';

function Grid({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="display px-6 text-[28px] leading-none">{title}</h2>
      <div className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] px-3">{children}</div>
    </section>
  );
}

/** Live — siaran yang sedang berlangsung, akan datang, dan sebelumnya (setara web /app/live). */
export default function Live() {
  const t = useT();
  const go = useNav((s) => s.go);
  const enabled = useLiveEnabled();
  const live = useLiveStreams('live', 24, 20_000, enabled);
  const upcoming = useLiveStreams('upcoming', 12, 60_000, enabled);
  const ended = useLiveStreams('ended', 8, 120_000, enabled);
  // Hero dikunci ke stream yang sedang diputar (urutan penonton berubah tiap polling — jangan ganti video).
  const [heroId, setHeroId] = useState<string | null>(null);
  const list = live.data?.data ?? [];
  const top = list.find((s) => s.id === heroId) ?? list[0];
  useEffect(() => {
    if (top && top.id !== heroId) setHeroId(top.id);
  }, [top, heroId]);

  if (!enabled) return <Empty title={t.live.unavailable} />;
  const rest = list.filter((s) => s.id !== top?.id);

  return (
    <div className="pb-10">
      <div className="grain bg-gradient-to-b from-berry/60 via-plum/30 to-transparent px-6 pt-2 pb-2">
        <h1 className="display flex items-center gap-3 text-[56px]">
          <Radio className="size-10 text-red-500" /> {t.live.title}
        </h1>
        <Loadable loading={live.loading} error={live.error} onRetry={live.reload} skeleton={<div className="mt-6 aspect-video max-w-4xl animate-pulse bg-raised" />}>
          {top ? (
            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-end">
              <LivePlayer streamId={top.id} status={top.status} autoMute />
              <div>
                <p className="label text-red-400">{t.live.eyebrow}</p>
                <h2 className="display mt-2 text-[40px] leading-none">{top.title}</h2>
                {top.artist && (
                  <button type="button" onClick={() => go({ name: 'artist', id: top.artist!.slug })} className="mt-2 font-bold text-muted hover:text-paper hover:underline">
                    {top.artist.name}
                  </button>
                )}
                {top.description && <p className="mt-3 line-clamp-3 text-sm text-muted">{top.description}</p>}
                <button type="button" onClick={() => go({ name: 'live-watch', id: top.id })} className="btn-primary mt-5 inline-flex items-center gap-2">
                  <MessageCircle className="size-4" /> {t.live.watch}
                </button>
              </div>
            </section>
          ) : (
            <div className="mt-6 border border-line bg-raised/60 p-8 text-center">
              <Radio className="mx-auto size-10 text-subtle" />
              <p className="mt-3 font-bold">{t.live.nobody}</p>
              <p className="mt-1 text-sm text-muted">{t.live.nobodyBody}</p>
            </div>
          )}
        </Loadable>
      </div>
      {rest.length > 0 && (
        <Grid title={t.live.liveNow}>
          {rest.map((s) => (
            <LiveCard key={s.id} s={s} />
          ))}
        </Grid>
      )}
      <Grid title={t.live.upcoming}>
        {upcoming.data && !upcoming.data.data.length ? <p className="px-3 text-sm text-muted">{t.live.noScheduled}</p> : upcoming.data?.data.map((s) => <LiveCard key={s.id} s={s} />)}
      </Grid>
      {!!ended.data?.data.length && (
        <Grid title={t.live.past}>
          {ended.data.data.map((s) => (
            <LiveCard key={s.id} s={s} />
          ))}
        </Grid>
      )}
    </div>
  );
}
