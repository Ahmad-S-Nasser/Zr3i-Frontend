import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { DEFAULT_SEASON } from '../config';
import { fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage, type MessageKey } from '../i18n/messages';
import { go, hrefs } from '../router';
import { Icon, type IconName } from './Icon';
import { Popover } from './Popover';

export interface ScreenItem {
  id: string;
  label: MessageKey;
  href: string;
}

interface SearchResult {
  groups: { kind: string; hits: { id: string; label: string; context: string | null }[] }[];
}

interface Row {
  key: string;
  group: string;
  label: string;
  sub?: string | null;
  href: string;
  icon: IconName;
}

const DATA_ICON: Record<string, IconName> = { farms: 'farms', parcels: 'parcels', farmers: 'farmers', reports: 'reports' };

function dataHref(kind: string, id: string): string {
  if (kind === 'farms') return hrefs.farm(id, DEFAULT_SEASON);
  if (kind === 'parcels') return hrefs.parcelEvidence(id, DEFAULT_SEASON);
  return kind === 'farmers' ? '#/farmers' : '#/reports';
}

/**
 * Go to a screen or find a farm, parcel, farmer or report in the signed-in organisation. Screens match at once; data is searched on the
 * server after a short pause, from two characters. Results are listed by name and never ranked.
 */
export function ScreenSearch({ items }: { items: ScreenItem[] }) {
  const { t } = useLang();
  const { org } = useAuth();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [data, setData] = useState<SearchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const needle = q.trim();

  useEffect(() => {
    if (!org || needle.length < 2) {
      setData(null);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api<SearchResult>(`/api/organisations/${org.id}/search?q=${encodeURIComponent(needle)}`, { signal: controller.signal })
        .then((r) => { setData(r); setFailed(false); })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setData(null);
          setFailed(true);
        });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [needle, org]);

  const rows = useMemo<Row[]>(() => {
    if (needle.length === 0) return [];
    const lower = needle.toLowerCase();
    const screens: Row[] = items.filter((i) => t(i.label).toLowerCase().includes(lower))
      .map((i) => ({ key: `s:${i.id}`, group: 'screens', label: t(i.label), href: i.href, icon: i.id as IconName }));
    const found: Row[] = (data?.groups ?? []).flatMap((g) => g.hits.map((h) => ({ key: `${g.kind}:${h.id}`, group: g.kind, label: h.label, sub: h.context, href: dataHref(g.kind, h.id), icon: DATA_ICON[g.kind] ?? 'search' })));
    return [...screens, ...found];
  }, [needle, items, data, t]);

  function pick(row: Row | undefined) {
    if (!row) return;
    setQ('');
    setOpen(false);
    go(row.href);
  }

  const groupLabel = (g: string) => t(g === 'screens' ? 'search.group.screens' : (`search.group.${g}` as MessageKey));

  return (
    <div className="zr-search" role="search">
      <Icon name="search" size={18} />
      <input
        type="search"
        aria-label={t('shell.search.label')}
        placeholder={t('shell.search.placeholder')}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setAt(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAt((v) => Math.min(v + 1, rows.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((v) => Math.max(v - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(rows[at]); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
      />
      {open && needle ? (
        <ul className="zr-pop-panel zr-search-list" role="listbox">
          {rows.length === 0 ? <li className="muted px-3 py-2 text-sm">{failed ? t('shell.search.error') : t('shell.search.none')}</li> : null}
          {rows.map((r, n) => (
            <li key={r.key} role="option" aria-selected={n === at}>
              {n === 0 || rows[n - 1].group !== r.group ? <p className="zr-search-group">{groupLabel(r.group)}</p> : null}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)} className={n === at ? 'on' : ''}>
                <Icon name={r.icon} size={16} />
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                {r.sub ? <span className="muted truncate text-xs" dir="auto">{r.sub}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface InboxItem {
  id: string;
  code: string;
  objectType: string;
  objectId: string;
  detail: string | null;
  createdAt: string;
  read: boolean;
}

interface Inbox {
  unreadCount: number;
  items: InboxItem[];
}

/** Where a notification leads. The code names the kind of event; the screen that shows it is a stable page. */
function notificationHref(code: string): string {
  if (code.startsWith('report.')) return '#/reports';
  if (code.startsWith('import.')) return '#/imports';
  if (code.startsWith('consent.')) return '#/consent';
  return '#/users';
}

/** The sentence for a notification: the code picks the words, the short detail fills in the report kind, file name or purpose. */
function notificationText(t: (k: MessageKey, v?: Record<string, string | number>) => string, n: InboxItem): string {
  const key = `notif.${n.code}`;
  if (!hasMessage(key)) return n.code;
  const detail = n.detail ?? '';
  const kind = hasMessage(`rep.kind.${detail}`) ? t(`rep.kind.${detail}` as MessageKey) : detail;
  return t(key as MessageKey, { kind, file: detail, purpose: detail });
}

/** The bell: this person's own notifications, newest first, with an unread count and a way to mark them read. */
export function NotificationBell() {
  const { t } = useLang();
  const { org } = useAuth();
  const { data, reload } = useApi<Inbox>(org ? `/api/organisations/${org.id}/notifications` : null);

  useEffect(() => {
    if (!org) return;
    const timer = window.setInterval(reload, 30000);
    return () => window.clearInterval(timer);
  }, [org, reload]);

  async function markAllRead() {
    if (!org) return;
    try {
      await api(`/api/organisations/${org.id}/notifications/read`, { method: 'POST', body: { all: true } });
    } finally {
      reload();
    }
  }

  const items = data?.items ?? [];
  return (
    <Popover label={t('notif.title')} badge={data?.unreadCount ?? 0} trigger={<Icon name="bell" />}>
      {(close) => (
        <div className="zr-menu">
          <p className="zr-menu-title">{t('notif.title')}</p>
          {items.length === 0 ? <p className="muted m-0 px-3 py-2 text-sm">{t('notif.none')}</p> : (
            <ul className="zr-notes">
              {items.map((n) => (
                <li key={n.id} className={n.read ? '' : 'unread'}>
                  <a href={notificationHref(n.code)} onClick={close}>
                    <span>{notificationText(t, n)}</span>
                    <span className="muted text-xs" dir="ltr">{fmtUtc(n.createdAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {(data?.unreadCount ?? 0) > 0 ? <button type="button" className="zr-menu-link" onClick={() => void markAllRead()}>{t('notif.markAll')}</button> : null}
        </div>
      )}
    </Popover>
  );
}

/** Who is signed in, which organisation, and sign out. */
export function UserMenu({ roleLabel }: { roleLabel: string }) {
  const { t } = useLang();
  const { me, org, setOrgId, signOut } = useAuth();
  const initial = (me?.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <Popover label={t('shell.user')} trigger={<><span className="zr-avatar" aria-hidden="true">{initial}</span><Icon name="chevron" size={16} /></>}>
      {() => (
        <div className="zr-menu">
          <p className="zr-menu-title" dir="ltr">{me?.email}</p>
          <p className="muted m-0 px-3 pb-2 text-sm">{roleLabel}</p>
          {me && me.organisations.length > 1 ? (
            <div className="px-3 pb-2">
              <select aria-label={t('common.orgSwitch')} className="zr-in !min-h-9 !py-0 text-sm" value={org?.id} onChange={(e) => setOrgId(e.target.value)}>
                {me.organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ) : null}
          <button type="button" className="zr-menu-link" onClick={() => void signOut()}><Icon name="logout" size={16} />{t('nav.signOut')}</button>
        </div>
      )}
    </Popover>
  );
}
