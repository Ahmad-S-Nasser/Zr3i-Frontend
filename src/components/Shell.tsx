import type { ReactNode } from 'react';
import { can, useAuth } from '../auth/AuthProvider';
import { NAV } from '../nav';
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
  const { me, org, setOrgId, signOut } = useAuth();

  // The sidebar is the account type's preset, filtered by what this role may open.
  const items = (org?.navigation ?? []).filter((id) => id in NAV && (NAV[id].permission === null || can(org?.permissions ?? [], NAV[id].permission))).map((id) => ({ id, ...NAV[id] }));
  // Farm and parcel pages belong to Farms where the preset has it, and otherwise to Risk.
  const active = route.name === 'section' ? route.id : route.name === 'parcel-evidence' || route.name === 'parcel-imagery' ? 'parcels' : route.name === 'farms' || route.name === 'farm' || route.name === 'parcel' ? (items.some((i) => i.id === 'farms') ? 'farms' : 'risk') : null;

  const typeLabel = (lang === 'ar' ? org?.accountTypeLabelAr : org?.accountTypeLabelEn) ?? org?.accountType ?? '';
  const roleNames = (org?.roles ?? []).map((r) => (`role.${r.key}` in messages.en ? t(`role.${r.key}` as MessageKey) : r.name));
  const label = [typeLabel, ...roleNames].filter(Boolean).join(' · ');

  return (
    <div className="-m-4 grid min-h-screen grid-cols-[var(--sidebar-w)_1fr] grid-rows-[auto_1fr]">
      <nav className="zr-nav row-span-2" aria-label={t('nav.label')}>
        <div className="px-3 pt-2 pb-6">
          <div dir="ltr" className="font-display text-2xl font-black text-zr-sage">
            {t('brand.wordmark')}
          </div>
          <div className="rule mt-2" style={{ width: 48 }} />
        </div>
        {items.map((i) => (
          <a key={i.id} href={i.href} aria-current={active === i.id ? 'page' : undefined}>
            {t(i.label)}
          </a>
        ))}
        <div className="mt-auto border-t border-zr-forest px-3 pt-4 text-xs">{t('brand.endorsement')}</div>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-3 bg-zr-field px-6 py-2 text-zr-mist">
        <div className="text-sm font-bold tracking-wide text-zr-amber">
          {org ? org.name : ''}
          {me && me.organisations.length > 1 ? (
            <select aria-label={t('common.orgSwitch')} className="zr-in ms-3 !min-h-9 !py-0 text-sm" value={org?.id} onChange={(e) => setOrgId(e.target.value)}>
              {me.organisations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>{label}</span>
          <LangToggle />
          <button type="button" className="zr-btn" onClick={() => void signOut()}>
            {t('nav.signOut')}
          </button>
        </div>
      </header>

      <main className="bg-ground px-6 py-6">
        {org?.isSynthetic ? <div className="banner synthetic mb-4" role="note"><span>{t('syn.bar')}</span></div> : null}
        <div className="mx-auto max-w-(--size-content-max)">{children}</div>
      </main>
    </div>
  );
}
