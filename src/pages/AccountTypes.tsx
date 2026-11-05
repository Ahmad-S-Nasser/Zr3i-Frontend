import { PageHeader } from '../components/ui';
import { useLang } from '../i18n/LangProvider';
import type { MessageKey } from '../i18n/messages';

// The five built-in account types, in the order the board lists them. Each card carries a top rule in a token colour.
const TYPES = [
  { key: 'zr3i-admin', rule: 'border-zr-field' },
  { key: 'bank', rule: 'border-zr-navy' },
  { key: 'insurance', rule: 'border-accent-ink' },
  { key: 'company', rule: 'border-zr-sage' },
  { key: 'farmer', rule: 'border-zr-amber' },
] as const;

const CAPABILITIES = [1, 2, 3, 4, 5, 6, 7] as const;

/** Who uses Zr3i: the five account types and what each can do (board "Platform · Account types"). The relationship diagram on the board is not built. */
export function AccountTypes() {
  const { t } = useLang();
  const k = (key: string) => key as MessageKey;

  return (
    <>
      <PageHeader crumb={t('acct.crumb')} title={t('acct.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('acct.intro')}</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map(({ key, rule }) => (
            <section key={key} className={`card border-t-4 ${rule}`}>
              <h2 className="title">{t(k(`accountType.${key}`))}</h2>
              <p className="eyebrow m-0">{t(k(`acct.${key}.model`))}</p>
              <p className="mt-2">{t(k(`acct.${key}.about`))}</p>
              <p className="muted m-0 text-sm">
                <b>{t('acct.sees')}</b> {t(k(`acct.${key}.sees`))}
              </p>
            </section>
          ))}
        </div>

        <section className="card !p-0 overflow-hidden" aria-labelledby="cap">
          <h2 id="cap" className="title px-4 py-3">{t('acct.cap.title')}</h2>
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('acct.cap.col')}</th>
                {TYPES.map(({ key }) => (
                  <th key={key}>{t(k(`accountType.${key}`))}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((n) => (
                <tr key={n}>
                  <td className="font-semibold">{t(k(`acct.cap.${n}`))}</td>
                  {TYPES.map(({ key }) => (
                    <td key={key}>{t(k(`acct.cap.${n}.${key}`))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="muted text-sm">{t('acct.footer')}</p>
      </div>
    </>
  );
}
