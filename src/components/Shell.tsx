import type { ReactNode } from 'react';
import { can, useAuth } from '../auth/AuthProvider';
import { useLang } from '../i18n/LangProvider';
import { messages, type MessageKey } from '../i18n/messages';
import { hrefs, type Route } from '../router';

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
  const { t } = useLang();
  const { me, org, setOrgId, signOut } = useAuth();
  const farmsOpen = org !== null && can(org.permissions, 'portfolio:farms:read');
  const typeKey = `accountType.${org?.accountType ?? ''}`;
  const typeLabel = typeKey in messages.en ? t(typeKey as MessageKey) : (org?.accountType ?? '');
  const inFarms = route.name === 'farms' || route.name === 'farm' || route.name === 'parcel';

  return (
    <div className="-m-4 grid min-h-screen grid-cols-[var(--sidebar-w)_1fr] grid-rows-[auto_1fr]">
      <nav className="zr-nav row-span-2" aria-label={t('nav.label')}>
        <div className="px-3 pt-2 pb-6">
          <div dir="ltr" className="font-display text-2xl font-black text-zr-sage">
            {t('brand.wordmark')}
          </div>
          <div className="rule mt-2" style={{ width: 48 }} />
        </div>
        {farmsOpen ? (
          <a href={hrefs.farms()} aria-current={inFarms ? 'page' : undefined}>
            {t('nav.farms')}
          </a>
        ) : null}
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
          <span>{typeLabel}</span>
          <LangToggle />
          <button type="button" className="zr-btn" onClick={() => void signOut()}>
            {t('nav.signOut')}
          </button>
        </div>
      </header>

      <main className="bg-ground px-6 py-6">
        <div className="mx-auto max-w-(--size-content-max)">{children}</div>
      </main>
    </div>
  );
}
