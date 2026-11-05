import { MaturityBadge, MethodBanner, Num, PageHeader, RiskBand } from '../components/ui';
import { useLang } from '../i18n/LangProvider';
import type { MessageKey } from '../i18n/messages';

const COMPONENTS = [
  ['water_security', 25],
  ['climate_exposure', 20],
  ['soil_and_land', 15],
  ['yield_stability', 15],
  ['management_quality', 10],
  ['tenure_and_rights', 8],
  ['peer_and_context', 7],
] as const;

const BANDS = [
  ['A', 0, 20],
  ['B', 20, 40],
  ['C', 40, 60],
  ['D', 60, 80],
  ['E', 80, 100],
] as const;

/** Methodology and maturity: what the indexes are and are not, the weights, the bands and the known limitations. Static, from the board. */
export function Methodology() {
  const { t } = useLang();
  const maturities = [
    { key: 'meth.specified', text: 'meth.specified.text', current: true },
    { key: 'meth.calibrated', text: 'meth.calibrated.text', current: false },
    { key: 'meth.validated', text: 'meth.validated.text', current: false },
  ] as const;

  return (
    <>
      <PageHeader crumb={t('nav.methodology')} title={t('meth.title')} />
      <div className="flex flex-col gap-4">
        <MethodBanner method="FRI-2026-01" />

        <div className="grid gap-4 md:grid-cols-3">
          {maturities.map((m) => (
            <section key={m.key} className={`card ${m.current ? 'border-brand' : ''}`}>
              <h2 className="eyebrow m-0">{t(m.key)}</h2>
              <p className="mt-2 mb-0">{t(m.text)}</p>
              {m.current ? <p className="mt-3 mb-0"><MaturityBadge /></p> : null}
            </section>
          ))}
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2">
          <section className="card">
            <h2 className="title">{t('meth.what.title')}</h2>
            <p className="m-0">{t('meth.what.text')}</p>
          </section>
          <section className="card">
            <h2 className="title">{t('meth.not.title')}</h2>
            <ul className="m-0 list-disc ps-5">
              {(['meth.not.1', 'meth.not.2', 'meth.not.3', 'meth.not.4'] as const).map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2">
          <section className="card !p-0 overflow-hidden" aria-labelledby="components">
            <div className="px-4 py-3">
              <h2 id="components" className="title">{t('meth.comp.title')}</h2>
              <p className="muted m-0 text-sm">{t('meth.comp.sub')}</p>
            </div>
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('col.component')}</th>
                  <th className="num !font-display">{t('col.weight')}</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENTS.map(([key, weight]) => (
                  <tr key={key}>
                    <td>{t(`component.${key}` as MessageKey)}</td>
                    <td className="num"><Num>{weight}</Num></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card !p-0 overflow-hidden" aria-labelledby="bands">
            <div className="px-4 py-3">
              <h2 id="bands" className="title">{t('meth.bands.title')}</h2>
              <p className="muted m-0 text-sm">{t('meth.bands.sub')}</p>
            </div>
            <table className="zr-t">
              <tbody>
                {BANDS.map(([band, from, to]) => (
                  <tr key={band}>
                    <td><RiskBand band={band} /></td>
                    <td className="num !font-sans">{t('meth.range', { from, to })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section className="card">
          <h2 className="title">{t('meth.limits.title')}</h2>
          <ul className="m-0 list-disc ps-5">
            {(['meth.limits.1', 'meth.limits.2', 'meth.limits.3', 'meth.limits.4'] as const).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
