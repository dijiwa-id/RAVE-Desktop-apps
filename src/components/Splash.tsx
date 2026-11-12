import { useEffect, useState } from 'react';

/** Splash pembuka (±1,6 dtk): piringan berputar masuk, huruf R-A-V-E jatuh seperti potongan kertas ransom-note. */
export function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');
  useEffect(() => {
    const a = setTimeout(() => setPhase('out'), 1500);
    const b = setTimeout(() => setPhase('gone'), 1950);
    return () => (clearTimeout(a), clearTimeout(b));
  }, []);
  if (phase === 'gone') return null;
  const letters = [
    ['R', 'bg-mustard text-ink', '-6deg'],
    ['A', 'bg-paper text-ink', '4deg'],
    ['V', 'bg-purple text-paper', '-3deg'],
    ['E', 'bg-ink text-mustard outline-2 outline-paper -outline-offset-4', '6deg'],
  ];
  return (
    <div
      aria-hidden
      className={`grain fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,#5b2a6e_0%,#2a1233_45%,#0e0c0f_80%)] transition-opacity duration-400 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="groove absolute size-[min(80vh,80vw)] animate-[splash-disc_1.6s_cubic-bezier(.2,.8,.2,1)_both]" />
      <div className="relative flex gap-1.5">
        {letters.map(([ch, cls, rot], i) => (
          <span
            key={ch}
            className={`display inline-block px-3 pt-2 text-[110px] shadow-[5px_5px_0_#0b0a0c] ${cls}`}
            style={{ rotate: rot, animation: `splash-drop .55s cubic-bezier(.3,1.6,.5,1) ${0.35 + i * 0.12}s both` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <p className="label sticker absolute top-[calc(50%+90px)] left-[calc(50%+40px)] bg-paper px-2 py-1 text-ink [--r:-5deg]" style={{ animation: 'splash-pop .35s ease-out 1s both' }}>
        DIY · Indie · Live
      </p>
      <p className="label absolute bottom-8 text-paper/50">RV-DESKTOP · DIJIWA.ID</p>
    </div>
  );
}
