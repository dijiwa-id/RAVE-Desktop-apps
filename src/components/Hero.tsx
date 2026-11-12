import type { ReactNode } from 'react';
import { Cover, cx } from '@/components/ui';

/** Header halaman koleksi: sampul besar, label jenis, judul poster, baris meta, lalu bilah aksi. */
export function Hero({ kind, title, image, meta, art, tint = 'from-purple/80', round, children }: { kind: string; title: string; image?: string | null; meta: ReactNode; art?: ReactNode; tint?: string; round?: boolean; children?: ReactNode }) {
  return (
    <>
      <div className={cx('grain flex items-end gap-6 bg-gradient-to-b to-base px-6 pt-4 pb-6', tint)}>
        {art ?? <Cover src={image} round={round} className="size-[200px] shadow-[0_16px_48px_rgb(0_0_0/0.55)] xl:size-[232px]" />}
        <div className="min-w-0 pb-1">
          <p className="label">{kind}</p>
          <h1 className={cx('display mt-2 break-words', title.length > 28 ? 'text-[44px]' : title.length > 16 ? 'text-[64px]' : 'text-[88px]')}>{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[13px] text-paper/85">{meta}</div>
        </div>
      </div>
      {children && <div className="flex items-center gap-5 bg-gradient-to-b from-base/60 to-transparent px-6 py-5">{children}</div>}
    </>
  );
}

export const Dot = () => <span aria-hidden>·</span>;
