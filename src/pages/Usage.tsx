import { useMemo, useState } from 'react';
import { ApiError, download } from '../api/client';
import type { Tenant } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { fmt } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

interface Row {
  id: string;
  name: string;
  accountType: string;
  parcels: number;
  areaFeddan: number;
  readings: number;
  usableReadings: number;
  scenes: number;
  pictures: number;
  pictureBytes: number;
  reports: number;
  downloads: number;
  importBatches: number;
  importedRows: number;
  grants: number;
  withdrawals: number;
  sharedReads: number;
}

interface Usage {
  from: string;
  to: string;
  organisations: Row[];
  totals: Omit<Row, 'id' | 'name' | 'accountType'>;
}

type Period = 'this-month' | 'last-month' | 'last-30';

function bounds(period: Period): { from: string; to: string } {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period === 'this-month') return { from: monthStart.toISOString(), to: now.toISOString() };
  if (period === 'last-month') return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString(), to: monthStart.toISOString() };
  return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to: now.toISOString() };
}

const mb = (bytes: number) => fmt(bytes / 1048576, 1);

/**
 * Usage across organisations for the Zr3i provider: what each organisation holds and did in a period, for revenue share. Counts only, never records.
 * "Open read-only" views the organisation itself (every page opened that way is logged for that organisation).
 */
export function Usage() {
  const { t } = useLang();
  const { startViewing } = useAuth();
  const [period, setPeriod] = useState<Period>('this-month');
  const range = useMemo(() => bounds(period), [period]);
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const usage = useApi<Usage>(`/api/platform/usage?${query}`);
  const tenants = useApi<Tenant[]>('/api/platform/organisations');
  const [error, setError] = useState<ApiError | null>(null);
  const typeName = (key: string) => (hasMessage(`accountType.${key}`) ? t(`accountType.${key}` as never) : key);

  async function csv() {
    setError(null);
    try {
      await download(`/api/platform/usage?${query}&format=csv`, `usage-${range.from.slice(0, 10)}.csv`);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    }
  }

  const open = (id: string) => {
    const tenant = tenants.data?.find((x) => x.id === id);
    if (tenant) startViewing(tenant);
  };
  const d = usage.data;
  const totals = d?.totals;

  return (
    <>
      <PageHeader crumb={t('use.crumb')} title={t('use.title')} actions={<button type="button" className="zr-btn" disabled={!d} onClick={() => void csv()}>{t('use.csv')}</button>} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('use.note')}</p>
        <div className="zr-field !max-w-xs">
          <label htmlFor="up">{t('use.period')}</label>
          <select id="up" className="zr-in" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="this-month">{t('use.period.this')}</option>
            <option value="last-month">{t('use.period.last')}</option>
            <option value="last-30">{t('use.period.30')}</option>
          </select>
        </div>
        {error ? <ErrorLine error={error} /> : null}
        {usage.error ? <ErrorLine error={usage.error} onRetry={usage.reload} /> : null}
        {usage.loading && !d ? <Loading /> : null}
        {d ? (
          <section className="card !p-0 overflow-x-auto">
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('tnt.col.org')}</th>
                  <th className="num !font-display">{t('use.col.parcels')}</th>
                  <th className="num !font-display">{t('use.col.area')}</th>
                  <th className="num !font-display">{t('use.col.readings')}</th>
                  <th className="num !font-display">{t('use.col.pictures')}</th>
                  <th className="num !font-display">{t('use.col.reports')}</th>
                  <th className="num !font-display">{t('use.col.imports')}</th>
                  <th className="num !font-display">{t('use.col.consents')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.organisations.map((o) => (
                  <tr key={o.id}>
                    <td><span className="font-semibold">{o.name}</span><div className="muted text-xs">{typeName(o.accountType)}</div></td>
                    <td className="num"><Num>{fmt(o.parcels, 0)}</Num></td>
                    <td className="num"><Num>{fmt(o.areaFeddan, 1)}</Num></td>
                    <td className="num"><Num>{fmt(o.readings, 0)}</Num><div className="muted text-xs"><Num>{t('use.usable', { n: fmt(o.usableReadings, 0) })}</Num></div></td>
                    <td className="num"><Num>{fmt(o.pictures, 0)}</Num><div className="muted text-xs"><Num>{mb(o.pictureBytes)} MB</Num></div></td>
                    <td className="num"><Num>{fmt(o.reports, 0)}</Num><div className="muted text-xs"><Num>{t('use.downloads', { n: fmt(o.downloads, 0) })}</Num></div></td>
                    <td className="num"><Num>{fmt(o.importBatches, 0)}</Num><div className="muted text-xs"><Num>{t('use.rows', { n: fmt(o.importedRows, 0) })}</Num></div></td>
                    <td className="num"><Num>{fmt(o.grants, 0)} · {fmt(o.withdrawals, 0)} · {fmt(o.sharedReads, 0)}</Num></td>
                    <td><button type="button" className="zr-btn whitespace-nowrap" disabled={!tenants.data} onClick={() => open(o.id)}>{t('use.open')}</button></td>
                  </tr>
                ))}
              </tbody>
              {totals ? (
                <tfoot>
                  <tr className="font-semibold">
                    <td>{t('use.totals')}</td>
                    <td className="num"><Num>{fmt(totals.parcels, 0)}</Num></td>
                    <td className="num"><Num>{fmt(totals.areaFeddan, 1)}</Num></td>
                    <td className="num"><Num>{fmt(totals.readings, 0)}</Num></td>
                    <td className="num"><Num>{fmt(totals.pictures, 0)}</Num><div className="muted text-xs font-normal"><Num>{mb(totals.pictureBytes)} MB</Num></div></td>
                    <td className="num"><Num>{fmt(totals.reports, 0)}</Num></td>
                    <td className="num"><Num>{fmt(totals.importBatches, 0)}</Num></td>
                    <td className="num"><Num>{fmt(totals.grants, 0)} · {fmt(totals.withdrawals, 0)} · {fmt(totals.sharedReads, 0)}</Num></td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
            <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('use.consents.note')}</p>
          </section>
        ) : null}
      </div>
    </>
  );
}
