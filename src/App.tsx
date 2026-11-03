import { useLang } from './i18n/LangProvider';

export function App() {
  const { lang, setLang, t } = useLang();

  return (
    <main className="-m-4 min-h-screen bg-zr-sage text-zr-navy">
      <header className="flex justify-end px-6 py-4">
        <div role="group" aria-label={t('lang.toggle.label')} className="flex gap-2">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className="zr-chip">
            {t('lang.toggle.en')}
          </button>
          <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')} className="zr-chip">
            {t('lang.toggle.ar')}
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-(--size-content-max) px-6 py-16">
        <p className="eyebrow">{t('brand.eyebrow')}</p>
        <h1 dir="ltr" className="mb-3 font-display text-[clamp(64px,12vw,144px)] leading-none font-black text-white">
          {t('brand.wordmark')}
        </h1>
        <div className="rule" />
        <p className="mt-4">{t('shell.status')}</p>
      </section>
    </main>
  );
}
