import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { Home as HomeData, MediaItem } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { useNav } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';
import { Cover, Loadable, PlayButton, SkeletonCards } from '@/components/ui';
import { MediaCard, playablesOf, routeOf, Shelf } from '@/components/media';

function greeting(t: ReturnType<typeof useT>) {
  const h = new Date().getHours();
  return h < 11 ? t.greet.morning : h < 15 ? t.greet.afternoon : h < 19 ? t.greet.evening : t.greet.night;
}

export default function Home() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const q = useApi<HomeData>('/v1/catalog/home');
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
