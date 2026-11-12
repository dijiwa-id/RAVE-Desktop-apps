import { create } from 'zustand';

/** Rute internal (tanpa URL bar di desktop) + riwayat maju/mundur seperti aplikasi musik desktop. */
export type Route =
  | { name: 'home' }
  | { name: 'search'; q?: string }
  | { name: 'library' }
  | { name: 'liked' }
  | { name: 'artist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'playlist'; id: string }
  | { name: 'show'; id: string }
  | { name: 'settings' };

interface NavState {
  stack: Route[];
  index: number;
  route: Route;
  go: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  forward: () => void;
}

const same = (a: Route, b: Route) => JSON.stringify(a) === JSON.stringify(b);

export const useNav = create<NavState>((set, get) => ({
  stack: [{ name: 'home' }],
  index: 0,
  route: { name: 'home' },
  go(r) {
    const { stack, index } = get();
    if (same(stack[index], r)) return;
    const next = [...stack.slice(0, index + 1), r].slice(-50);
    set({ stack: next, index: next.length - 1, route: r });
  },
  replace(r) {
    const { stack, index } = get();
    const next = [...stack];
    next[index] = r;
    set({ stack: next, route: r });
  },
  back() {
    const { stack, index } = get();
    if (index > 0) set({ index: index - 1, route: stack[index - 1] });
  },
  forward() {
    const { stack, index } = get();
    if (index < stack.length - 1) set({ index: index + 1, route: stack[index + 1] });
  },
}));

/** Ubah href web (`/app/album/:id`, `/app/artist/:slug`, …) dari API menjadi rute desktop. */
export function routeFromHref(href: string): Route | null {
  const m = /^\/app\/(album|artist|playlist|show)\/([^/?#]+)/.exec(href);
  if (!m) return null;
  return { name: m[1] as 'album' | 'artist' | 'playlist' | 'show', id: decodeURIComponent(m[2]) };
}
