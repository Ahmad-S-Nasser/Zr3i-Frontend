import { useEffect, useState } from 'react';

// A small hash router: the app is a single static page, so no server rewrite rules are needed and no package is added.

import { SECTION_IDS } from './nav';

export type Route =
  | { name: 'sign-in' }
  | { name: 'home' }
  | { name: 'section'; id: string; season: string | null }
  | { name: 'dev-login' }
  | { name: 'request-access' }
  | { name: 'parcel-evidence'; id: string; season: string | null }
  | { name: 'parcel-imagery'; id: string; season: string | null }
  | { name: 'scene'; sceneId: string }
  | { name: 'accept'; token: string | null }
  | { name: 'reset-authenticator'; token: string | null }
  | { name: 'consent-link'; token: string }
  | { name: 'farms'; season: string | null }
  | { name: 'farm'; farmId: string; season: string }
  | { name: 'parcel'; parcelSeasonId: string }
  | { name: 'not-found' };

export function parseHash(hash: string): Route {
  const [rawPath, rawQuery = ''] = hash.replace(/^#/, '').split('?');
  const parts = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(rawQuery);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'sign-in' && parts.length === 1) return { name: 'sign-in' };
  if (parts[0] === 'request-access' && parts.length === 1) return { name: 'request-access' };
  if (parts[0] === 'accept' && parts.length === 1) return { name: 'accept', token: query.get('token') };
  if (parts[0] === 'reset-authenticator' && parts.length === 1) return { name: 'reset-authenticator', token: query.get('token') };
  if (parts[0] === 'c' && parts.length === 2) return { name: 'consent-link', token: parts[1] };
  if (import.meta.env.DEV && parts[0] === 'dev-login' && parts.length === 1) return { name: 'dev-login' };
  if (parts[0] === 'farms' && parts.length === 1) return { name: 'farms', season: query.get('season') };
  if (parts[0] === 'farms' && parts[2] === 'seasons' && parts.length === 4) return { name: 'farm', farmId: parts[1], season: parts[3] };
  if (parts.length === 1 && SECTION_IDS.includes(parts[0])) return { name: 'section', id: parts[0], season: query.get('season') };
  if (parts[0] === 'satellite' && parts[1] === 'scenes' && parts.length === 3) return { name: 'scene', sceneId: parts[2] };
  if (parts[0] === 'parcels' && parts.length === 2) return { name: 'parcel-evidence', id: parts[1], season: query.get('season') };
  if (parts[0] === 'parcels' && parts.length === 3 && parts[2] === 'imagery') return { name: 'parcel-imagery', id: parts[1], season: query.get('season') };
  if (parts[0] === 'parcel-seasons' && parts.length === 2) return { name: 'parcel', parcelSeasonId: parts[1] };
  return { name: 'not-found' };
}

export const hrefs = {
  signIn: () => '#/sign-in',
  devLogin: () => '#/dev-login',
  requestAccess: () => '#/request-access',
  parcelEvidence: (id: string, season?: string | null) => `#/parcels/${encodeURIComponent(id)}${season ? `?season=${encodeURIComponent(season)}` : ''}`,
  parcelImagery: (id: string, season?: string | null) => `#/parcels/${encodeURIComponent(id)}/imagery${season ? `?season=${encodeURIComponent(season)}` : ''}`,
  farms: (season?: string) => (season ? `#/farms?season=${encodeURIComponent(season)}` : '#/farms'),
  farm: (farmId: string, season: string) => `#/farms/${encodeURIComponent(farmId)}/seasons/${encodeURIComponent(season)}`,
  scene: (sceneId: string) => `#/satellite/scenes/${encodeURIComponent(sceneId)}`,
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
