import { ExternalLink, Pause, Play } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { openExternal } from '@/lib/native';
import { useAds } from '@/stores/ads';
import { Cover } from '@/components/ui';

/** Bilah iklan menggantikan bilah pemutar selama jeda iklan tier Gratis. */
export function AdBar() {
  const t = useT();
  const { active, toggle, skip, click } = useAds();
  const ad = active?.ads[active.index];
  if (!active || !ad) return null;
  const elapsed = Math.floor(active.elapsedMs / 1000);
  const left = Math.max(0, ad.duration_s - elapsed);
  const skipIn = ad.skippable_after_s == null ? null : Math.max(0, ad.skippable_after_s - elapsed);
  const pct = Math.min(100, (active.elapsedMs / (ad.duration_s * 1000)) * 100);
  return (
    <footer className="relative flex h-[84px] shrink-0 items-center gap-4 px-4" style={{ background: ad.theme_color ?? undefined }} aria-label={t.ads.label}>
      <div className="absolute inset-x-0 top-0 h-1 bg-line">
        <div className="h-full bg-mustard transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <Cover src={ad.image_url} className="size-14" />
      <div className="min-w-0 flex-1">
        <p className="label text-mustard">
          {t.ads.label} · {ad.advertiser} · {left}s
        </p>
        <p className="truncate font-bold">{ad.title}</p>
        {ad.body && <p className="truncate text-[13px] text-muted">{ad.body}</p>}
      </div>
      <button type="button" aria-label={active.paused ? t.common.play : t.common.pause} onClick={toggle} className="grid size-10 place-items-center border-2 border-ink bg-paper text-ink">
        {active.paused ? <Play className="size-5 fill-current" /> : <Pause className="size-5 fill-current" />}
      </button>
      {ad.click_url && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            click();
            void openExternal(ad.click_url!);
          }}
        >
          {ad.cta_label ?? t.ads.open} <ExternalLink className="size-3.5" />
        </button>
      )}
      {skipIn != null && (
        <button type="button" className="btn-ghost" disabled={skipIn > 0} onClick={skip}>
          {skipIn > 0 ? t.ads.skipIn(skipIn) : t.ads.skip}
        </button>
      )}
      <p className="hidden max-w-56 text-[11px] text-subtle 2xl:block">{t.ads.why}</p>
    </footer>
  );
}
