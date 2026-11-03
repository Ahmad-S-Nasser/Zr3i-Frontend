import { useLang } from './i18n/LangProvider';

export function App() {
  const { lang, setLang, t } = useLang();

  return (
    <main className="shell">
      <header className="shell__bar">
        <div role="group" aria-label={t('lang.toggle.label')} className="zr-chip-group">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            {t('lang.toggle.en')}
          </button>
          <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>
            {t('lang.toggle.ar')}
          </button>
        </div>
      </header>
      <section className="shell__hero">
        <p className="eyebrow">{t('brand.eyebrow')}</p>
        <h1 className="shell__wordmark" dir="ltr">{t('brand.wordmark')}</h1>
        <div className="rule" />
        <p>{t('shell.status')}</p>
      </section>
    </main>
  );
}
