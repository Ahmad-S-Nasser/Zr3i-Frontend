import type { Organisation } from './api/types';
import type { MessageKey } from './i18n/messages';

// (This file must not import router.ts: router.ts imports SECTION_IDS from here.)
// The sidebar is data. The API returns each account type's preset (`navigation`, `homeView`) and this file maps those stable ids to a route,
// a label and the permission needed to open it. Nothing here branches on the account type (CLAUDE.md rule 2).

export interface NavDef {
  label: MessageKey;
  href: string;
  /** Permission the role needs to see the item. An item the role cannot open is absent, never greyed out. Null means everyone. */
  permission: string | null;
}

export const NAV: Record<string, NavDef> = {
  portfolio: { label: 'nav.portfolio', href: '#/portfolio', permission: 'portfolio:farms:read' },
  farms: { label: 'nav.farms', href: '#/farms', permission: 'portfolio:farms:read' },
  farmers: { label: 'nav.farmers', href: '#/farmers', permission: 'kernel:farmers:read' },
  risk: { label: 'nav.risk', href: '#/risk', permission: 'risk:indicators:read' },
  imports: { label: 'nav.imports', href: '#/imports', permission: 'kernel:imports:read' },
  methodology: { label: 'nav.methodology', href: '#/methodology', permission: null },
  tenants: { label: 'nav.tenants', href: '#/tenants', permission: 'platform:tenants:read' },
  'account-types': { label: 'nav.account-types', href: '#/account-types', permission: 'platform:account-types:read' },
  methods: { label: 'nav.methods', href: '#/methods', permission: 'platform:methods:read' },
  tranches: { label: 'nav.tranches', href: '#/tranches', permission: 'kernel:shared:read' },
  reports: { label: 'nav.reports', href: '#/reports', permission: 'kernel:reports:read' },
  'event-evidence': { label: 'nav.event-evidence', href: '#/event-evidence', permission: 'kernel:shared:read' },
  'my-farms': { label: 'nav.my-farms', href: '#/my-farms', permission: 'portfolio:farms:read' },
  consent: { label: 'nav.consent', href: '#/consent', permission: 'kernel:consents:read' },
  users: { label: 'nav.users', href: '#/users', permission: 'kernel:users:manage' },
  audit: { label: 'nav.audit', href: '#/audit', permission: 'kernel:audit:manage' },
  'access-requests': { label: 'nav.access-requests', href: '#/access-requests', permission: 'platform:access-requests:manage' },
};

/** Ids that have a plain `#/<id>` page. Farms keeps its own routes (list, farm, parcel). */
export const SECTION_IDS: readonly string[] = Object.keys(NAV).filter((id) => id !== 'farms');

/** A preset's home view names a screen; a few home views use a different word from the sidebar item that opens them. */
const HOME_ITEM: Record<string, string> = { 'tranche-check': 'tranches' };

export function homeHref(org: Pick<Organisation, 'homeView' | 'navigation'>): string {
  const wanted = HOME_ITEM[org.homeView ?? ''] ?? org.homeView ?? '';
  const id = wanted in NAV ? wanted : org.navigation.find((n) => n in NAV);
  return id ? NAV[id].href : NAV.farms.href;
}
