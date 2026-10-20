/** Tiny hash router so the app works on any static host. */
export type Route =
  | { name: 'home' }
  | { name: 'track'; id: string }
  | { name: 'share'; payload: string };

export function parseHash(hash: string = window.location.hash): Route {
  const h = hash.replace(/^#\/?/, '');
  const share = h.match(/^s\/(.+)/i);
  if (share) return { name: 'share', payload: share[1] };
  const m = h.match(/^track\/([^/?#]+)/i);
  if (m) return { name: 'track', id: decodeURIComponent(m[1]) };
  return { name: 'home' };
}

export function trackHref(orderId: string): string {
  return `#/track/${encodeURIComponent(orderId)}`;
}

export function homeHref(): string {
  return '#/';
}
