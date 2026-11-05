import { useEffect, useState } from 'react';

// A small hash router: the app is a single static page, so no server rewrite rules are needed and no package is added.

export type Route =
  | { name: 'sign-in' }
  | { name: 'farms'; season: string | null }
  | { name: 'farm'; farmId: string; season: string }
  | { name: 'parcel'; parcelSeasonId: string }
  | { name: 'not-found' };

export function parseHash(hash: string): Route {
  const [rawPath, rawQuery = ''] = hash.replace(/^#/, '').split('?');
  const parts = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(rawQuery);

  if (parts.length === 0) return { name: 'farms', season: null };
  if (parts[0] === 'sign-in' && parts.length === 1) return { name: 'sign-in' };
  if (parts[0] === 'farms' && parts.length === 1) return { name: 'farms', season: query.get('season') };
  if (parts[0] === 'farms' && parts[2] === 'seasons' && parts.length === 4) return { name: 'farm', farmId: parts[1], season: parts[3] };
  if (parts[0] === 'parcel-seasons' && parts.length === 2) return { name: 'parcel', parcelSeasonId: parts[1] };
  return { name: 'not-found' };
}

export const hrefs = {
  signIn: () => '#/sign-in',
  farms: (season?: string) => (season ? `#/farms?season=${encodeURIComponent(season)}` : '#/farms'),
  farm: (farmId: string, season: string) => `#/farms/${encodeURIComponent(farmId)}/seasons/${encodeURIComponent(season)}`,
  parcel: (parcelSeasonId: string) => `#/parcel-seasons/${encodeURIComponent(parcelSeasonId)}`,
};

export function go(href: string): void {
  window.location.hash = href.replace(/^#/, '');
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
