import type { Grant, ParcelItem, ParcelList } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Grants } from '../components/Grants';
import { ErrorLine, Kpi, Loading, NotAssessable, Num, PageHeader, useCropName } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';

/**
 * The farmer's home: their parcels with what they declared and what the satellite record measured, and who can see their data.
 * A difference is shown as a fact ("Differs"), never as a verdict; a parcel the image is too coarse for is "not assessable", never "no crop".
 */
export function MyFarms() {
  const { t } = useLang();
  const { org } = useAuth();
  const cropName = useCropName();
  const parcels = useApi<ParcelList>(org ? `/api/organisations/${org.id}/parcels?season=${DEFAULT_SEASON}&pageSize=200` : null);
  const grants = useApi<Grant[]>(org ? `/api/organisations/${org.id}/consents` : null);

  const items = parcels.data?.items ?? [];
  const area = items.reduce((sum, p) => sum + (p.measuredAreaFeddan ?? 0), 0);
  const live = (grants.data ?? []).filter((g) => g.role === 'owner' && (g.status === 'active' || g.status === 'scheduled'));

  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={t('mine.title')} />
      <div className="flex flex-col gap-4">
        {parcels.error ? <ErrorLine error={parcels.error} onRetry={parcels.reload} /> : null}
        {parcels.loading ? <Loading /> : null}

        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <Kpi label={t('mine.kpi.parcels')} value={<Num>{fmt(items.length, 0)}</Num>} />
          <Kpi label={t('mine.kpi.area')} value={<Num>{fmt(area)}</Num>} />
        </div>

        <section className="card !p-0 overflow-hidden" aria-labelledby="parcels">
          <h2 id="parcels" className="title px-4 py-3">{t('mine.parcels')}</h2>
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('col.parcel')}</th>
                <th>{t('col.crop')}</th>
                <th className="num !font-display">{t('mine.col.declared')}</th>
                <th className="num !font-display">{t('mine.col.measured')}</th>
                <th>{t('cons.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td><Num>{p.label}</Num></td>
                  <td>{cropName(p.crop)}</td>
                  <td className="num">{fmt(p.declaredAreaFeddan)}</td>
                  <td className="num">{fmt(p.measuredAreaFeddan)}</td>
                  <td><ParcelStatus p={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!parcels.loading && items.length === 0 ? <p className="muted px-4 py-3">{t('mine.empty')}</p> : null}
          <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('mine.note')}</p>
        </section>

        <section className="card !p-0 overflow-hidden" aria-labelledby="who">
          <div className="px-4 py-3">
            <h2 id="who" className="title">{t('mine.who.title')}</h2>
            <p className="muted m-0 text-sm">{t('mine.who.text')}</p>
          </div>
          <div className="px-4 pb-3">
            {grants.error ? <ErrorLine error={grants.error} onRetry={grants.reload} /> : <Grants grants={live} onChanged={grants.reload} empty="mine.who.none" />}
          </div>
        </section>
      </div>
    </>
  );
}

/** One word and one icon per parcel, in plain terms for the farmer. */
function ParcelStatus({ p }: { p: ParcelItem }) {
  const { t } = useLang();
  const f = p.finding;
  if (!f) return <span className="muted">{t('status.none')}</span>;
  if (f.status === 'NOT_ASSESSABLE') return <NotAssessable>{f.reason === 'below_resolution' ? t('status.tooCoarse') : t('status.notAssessable')}</NotAssessable>;
  if (f.status === 'FLAGGED') return <span className="pill flagged"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1z" fill="currentColor" /></svg>{t('status.flagged')}</span>;
  if (f.status === 'PENDING') return <span className="pill pending"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1a5 5 0 0 0 0 10z" fill="currentColor" /><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>{t('status.pending')}</span>;
  return <span className="pill confirmed"><svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="currentColor" /></svg>{t('status.measured')}</span>;
}
