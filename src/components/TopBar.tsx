import { useEffect, useMemo, useState } from 'react';
import { can, useAuth } from '../auth/AuthProvider';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage, type MessageKey } from '../i18n/messages';
import { fmtUtc } from '../format';
import { go } from '../router';
import { Icon } from './Icon';
import { Popover } from './Popover';

export interface ScreenItem {
  id: string;
  label: MessageKey;
  href: string;
}

/** Jump to any screen the role can open, by name. It searches the sidebar, not data. */
export function ScreenSearch({ items }: { items: ScreenItem[] }) {
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((i) => t(i.label).toLowerCase().includes(needle)) : [];
  }, [q, items, t]);

  function pick(item: ScreenItem | undefined) {
    if (!item) return;
    setQ('');
    setOpen(false);
    go(item.href);
  }

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
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAt((v) => Math.min(v + 1, found.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((v) => Math.max(v - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(found[at]); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
      />
      {open && q.trim() ? (
        <ul className="zr-pop-panel zr-search-list" role="listbox">
          {found.length === 0 ? <li className="muted px-3 py-2 text-sm">{t('shell.search.none')}</li> : found.map((i, n) => (
            <li key={i.id} role="option" aria-selected={n === at}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)} className={n === at ? 'on' : ''}>
                <Icon name={i.id as never} size={16} />{t(i.label)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface ReportActivity {
  ready: { id: string; kind: string; subjectName: string; createdAt: string }[];
  pending: { reportId: string; kind: string; status: string }[];
}

/** The bell shows real report activity: reports being prepared, ones that could not be, and the latest frozen. Nothing else is invented. */
export function ReportBell() {
  const { t } = useLang();
  const { org } = useAuth();
  const allowed = org !== null && can(org.permissions, 'kernel:reports:read');
  const { data, reload } = useApi<ReportActivity>(allowed && org ? `/api/organisations/${org.id}/reports` : null);

  useEffect(() => {
    if (!allowed) return;
    const timer = window.setInterval(reload, 30000);
    return () => window.clearInterval(timer);
  }, [allowed, reload]);

  if (!allowed) return null;
  const kind = (k: string) => (hasMessage(`rep.kind.${k}`) ? t(`rep.kind.${k}` as MessageKey) : k);
  const pending = data?.pending ?? [];
  const recent = (data?.ready ?? []).slice(0, 4);
  const active = pending.length;

  return (
    <Popover label={t('shell.bell.title')} badge={active} trigger={<Icon name="bell" />}>
      {(close) => (
        <div className="zr-menu">
          <p className="zr-menu-title">{t('shell.bell.title')}</p>
          {pending.length === 0 && recent.length === 0 ? <p className="muted m-0 px-3 py-2 text-sm">{t('shell.bell.none')}</p> : null}
          {pending.map((p) => (
            <p key={p.reportId} className="m-0 px-3 py-2 text-sm">{t(p.status === 'failed' ? 'shell.bell.failed' : 'shell.bell.preparing', { kind: kind(p.kind) })}</p>
          ))}
          {recent.map((r) => (
            <p key={r.id} className="m-0 px-3 py-2 text-sm">{t('shell.bell.ready', { kind: kind(r.kind), subject: r.subjectName })}<br /><span className="muted text-xs" dir="ltr">{fmtUtc(r.createdAt)}</span></p>
          ))}
          <a className="zr-menu-link" href="#/reports" onClick={close}>{t('shell.bell.open')}</a>
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
