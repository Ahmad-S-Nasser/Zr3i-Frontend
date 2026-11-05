import type { AccuracyEntry } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader, useCropName } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

/**
 * Accuracy and hit rate. The hit rate needs a sample of flags an agronomist has walked and judged; none exists yet, so every figure here is
 * "not established" and nothing is estimated. The table lists what has been found, by kind, so the sample can be planned.
 */
export function Accuracy() {
  const { t } = useLang();
  const { org } = useAuth();
  const cropName = useCropName();
  const { data, error, loading, reload } = useApi<AccuracyEntry[]>(org ? `/api/organisations/${org.id}/verification/accuracy` : null);
  const statusName = (s: string) => (s === 'MEASURED' ? t('ver.confirmed') : s === 'FLAGGED' ? t('ver.flagged') : s === 'PENDING' ? t('ver.pending') : s === 'NOT_ASSESSABLE' ? t('ver.notAssessable') : s);

  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={t('acc2.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('acc2.intro')}</p>
        <div className="banner neutral" role="note"><span><b>NOT_ESTABLISHED.</b> {t('acc2.none')}</span></div>
        {error ? <ErrorLine error={error} onRetry={reload} /> : null}
        {loading ? <Loading /> : null}
        {data && data.length === 0 ? <p className="muted">{t('acc2.empty')}</p> : null}

        {data && data.length > 0 ? (
          <section className="card !p-0 overflow-hidden">
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('acc2.col.stratum')}</th>
                  <th>{t('acc2.col.crop')}</th>
                  <th>{t('acc2.col.size')}</th>
                  <th className="num !font-display">{t('acc2.col.findings')}</th>
                  <th>{t('acc2.col.status')}</th>
                  <th>{t('acc2.col.hit')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.accuracyRef}>
                    <td>
                      <div>{hasMessage(`ev.type.${e.findingType}`) ? t(`ev.type.${e.findingType}` as never) : e.findingType}</div>
                      <div className="muted font-mono text-xs"><Num>{e.methodId} v{e.methodVersion}</Num></div>
                    </td>
                    <td>{e.crop === '-' ? t('common.none') : cropName(e.crop)}</td>
                    <td className="font-mono text-xs"><Num>{e.sizeClass}</Num></td>
                    <td className="num"><Num>{e.currentFindings}</Num></td>
                    <td className="text-sm">{Object.entries(e.byStatus).map(([s, n]) => (<span key={s} className="me-3 whitespace-nowrap">{statusName(s)} <Num>{n}</Num></span>))}</td>
                    <td><span className="pill pending">{t('acc2.notEstablished')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          {([['acc2.control', 'acc2.control.text'], ['acc2.blind', 'acc2.blind.text'], ['acc2.second', 'acc2.second.text']] as const).map(([title, text]) => (
            <section key={title} className="card">
              <h2 className="eyebrow m-0">{t(title)}</h2>
              <p className="display mt-1">{t('acc2.walked', { n: 0 })}</p>
              <p className="muted m-0 text-sm">{t(text)}</p>
            </section>
          ))}
        </div>
        <p className="muted text-sm">{t('acc2.footer')}</p>
      </div>
    </>
  );
}
