import { useState, type ReactNode } from 'react';
import { CircleAlert, Loader2, Pause, Play, X } from 'lucide-react';
import { errorText, media } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useToast } from '@/stores/toast';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Sampul/foto dengan cadangan piringan hitam bila kosong/gagal dimuat. */
export function Cover({ src, alt = '', round, className }: { src: string | null | undefined; alt?: string; round?: boolean; className?: string }) {
  const [bad, setBad] = useState(false);
  const url = media(src);
  return (
    <div className={cx('relative shrink-0 overflow-hidden bg-raised', round ? 'rounded-full' : '', className)}>
      {url && !bad ? (
        <img src={url} alt={alt} loading="lazy" decoding="async" draggable={false} onError={() => setBad(true)} className="size-full object-cover" />
      ) : (
        <div className="groove absolute inset-[12%]" aria-hidden />
      )}
    </div>
  );
}

/** Tombol putar khas RAVE: kotak mustard dengan bayangan sablon (bukan lingkaran). */
export function PlayButton({ playing, onClick, size = 'md', label }: { playing?: boolean; onClick: () => void; size?: 'sm' | 'md' | 'lg'; label: string }) {
  const s = { sm: 'size-9', md: 'size-12', lg: 'size-14' }[size];
  const i = { sm: 'size-4', md: 'size-5', lg: 'size-6' }[size];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cx(s, 'grid place-items-center border-2 border-ink bg-mustard text-ink shadow-[3px_3px_0_#0b0a0c] transition hover:-translate-y-0.5 hover:bg-mustard-hi active:translate-y-0')}
    >
      {playing ? <Pause className={cx(i, 'fill-current')} /> : <Play className={cx(i, 'translate-x-px fill-current')} />}
    </button>
  );
}

export function IconButton({ label, onClick, active, children, className, disabled }: { label: string; onClick?: () => void; active?: boolean; children: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cx('grid size-8 place-items-center text-muted transition hover:text-paper disabled:opacity-40', active && 'text-mustard hover:text-mustard-hi', className)}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-5 animate-spin text-muted', className)} aria-hidden />;
}

/** Status muat/galat standar untuk tiap tampilan. */
export function Loadable({ loading, error, onRetry, children, skeleton }: { loading: boolean; error: unknown; onRetry: () => void; children: ReactNode; skeleton?: ReactNode }) {
  const t = useT();
  if (error)
    return (
      <div className="grid place-items-center gap-3 px-6 py-20 text-center">
        <CircleAlert className="size-8 text-berry" aria-hidden />
        <p className="max-w-md text-sm text-muted">{errorText(error, t.common.offline)}</p>
        <button type="button" className="btn-ghost" onClick={onRetry}>
          {t.common.retry}
        </button>
      </div>
    );
  if (loading) return <>{skeleton ?? <div className="grid place-items-center py-24"><Spinner /></div>}</>;
  return <>{children}</>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-16 text-center">
      <div className="groove size-16" aria-hidden />
      <p className="display mt-2 text-2xl">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4 px-6">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="animate-pulse p-3">
          <div className="aspect-square bg-raised" />
          <div className="mt-3 h-3 w-3/4 bg-raised" />
          <div className="mt-2 h-3 w-1/2 bg-raised" />
        </div>
      ))}
    </div>
  );
}

export function Toasts() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {items.map((x) => (
        <div
          key={x.id}
          role={x.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'rise pointer-events-auto flex max-w-lg items-center gap-3 border-2 border-ink px-4 py-2.5 text-sm font-semibold shadow-[3px_3px_0_#0b0a0c]',
            x.tone === 'error' ? 'bg-berry text-paper' : x.tone === 'success' ? 'bg-mustard text-ink' : 'bg-paper text-ink',
          )}
        >
          <span className="min-w-0">{x.text}</span>
          <button type="button" aria-label="Tutup" onClick={() => dismiss(x.id)} className="opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
