import { useState, type ReactNode } from 'react';
import { can, useAuth } from '../auth/AuthProvider';
import { NAV } from '../nav';
import { Icon, type IconName } from './Icon';
import { NotificationBell, ScreenSearch, UserMenu } from './TopBar';
import { useLang } from '../i18n/LangProvider';
import { messages, type MessageKey } from '../i18n/messages';
import type { Route } from '../router';

export function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div role="group" aria-label={t('lang.toggle.label')} className="zr-lang">
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        {t('lang.toggle.en')}
      </button>
      <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>
        {t('lang.toggle.ar')}
      </button>
    </div>
  );
}

/** Sidebar, header and one content area. The sidebar lists only what the signed-in role may open. */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { t, lang } = useLang();
  const { org } = useAuth();

  // The sidebar is the account type's preset, filtered by what this role may open.
  const items = (org?.navigation ?? []).filter((id) => id in NAV && (NAV[id].permission === null || can(org?.permissions ?? [], NAV[id].permission))).map((id) => ({ id, ...NAV[id] }));
  // Farm and parcel pages belong to Farms where the preset has it, and otherwise to Risk.
  const active = route.name === 'section' ? route.id : route.name === 'scene' ? 'satellite' : route.name === 'parcel-evidence' || route.name === 'parcel-imagery' ? 'parcels' : route.name === 'farms' || route.name === 'farm' || route.name === 'parcel' ? (items.some((i) => i.id === 'farms') ? 'farms' : 'risk') : null;

  const typeLabel = (lang === 'ar' ? org?.accountTypeLabelAr : org?.accountTypeLabelEn) ?? org?.accountType ?? '';
  const roleNames = (org?.roles ?? []).map((r) => (`role.${r.key}` in messages.en ? t(`role.${r.key}` as MessageKey) : r.name));
  const label = [typeLabel, ...roleNames].filter(Boolean).join(' · ');

  // The menu can be narrowed to icons; the choice is remembered on this device.
  const [narrow, setNarrow] = useState<boolean>(() => {
    try { return localStorage.getItem('zr3i.nav') === 'narrow'; } catch { return false; }
  });
  const toggleNarrow = () => setNarrow((v) => {
    try { localStorage.setItem('zr3i.nav', v ? 'wide' : 'narrow'); } catch { /* storage can be blocked */ }
    return !v;
  });

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr]" style={{ gridTemplateColumns: `${narrow ? '72px' : 'var(--sidebar-w)'} 1fr` }}>
      <nav className="zr-nav row-span-2" style={{ width: '100%' }} aria-label={t('nav.label')} data-narrow={narrow ? 'true' : undefined}>
        <div className="px-3 pt-2 pb-6">
          <div dir="ltr" className="font-display text-2xl font-black text-zr-sage">
            {narrow ? 'Z' : t('brand.wordmark')}
          </div>
          <div className="rule mt-2" style={{ width: 48 }} />
        </div>
        {items.map((i) => (
          <a key={i.id} href={i.href} aria-current={active === i.id ? 'page' : undefined} title={narrow ? t(i.label) : undefined} aria-label={narrow ? t(i.label) : undefined}>
            <Icon name={i.id as IconName} />
            {narrow ? null : <span>{t(i.label)}</span>}
          </a>
        ))}
        {narrow ? null : <div className="mt-auto border-t border-zr-forest px-3 pt-4 text-xs">{t('brand.endorsement')}</div>}
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-3 bg-zr-field px-6 py-2 text-zr-mist">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" className="zr-iconbtn" aria-label={t(narrow ? 'shell.expand' : 'shell.collapse')} onClick={toggleNarrow}><Icon name="menu" /></button>
          <ScreenSearch items={items.map((i) => ({ id: i.id, label: i.label, href: i.href }))} />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-sm font-bold tracking-wide text-zr-amber md:inline">{org ? org.name : ''}</span>
          <NotificationBell />
          <LangToggle />
          <UserMenu roleLabel={label} />
        </div>
      </header>

      <main className="bg-ground px-6 py-6">
        {org?.isSynthetic ? <div className="banner synthetic mb-4" role="note"><span>{t('syn.bar')}</span></div> : null}
        <div className="mx-auto max-w-(--size-content-max)">{children}</div>
      </main>
    </div>
  );
}
