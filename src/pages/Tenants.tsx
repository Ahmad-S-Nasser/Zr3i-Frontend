import type { Tenant } from '../api/types';
import { canOversee, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { fmt, fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

/** Every customer organisation, for the Zr3i provider: its account type, modules, members, farms and parcels. Read-only. */
export function Tenants() {
  const { t } = useLang();
  const { org, startViewing } = useAuth();
  const mayOpen = org !== null && canOversee(org.permissions);
  const { data, error, loading, reload } = useApi<Tenant[]>('/api/platform/organisations');
  const typeName = (key: string) => (hasMessage(`accountType.${key}`) ? t(`accountType.${key}` as never) : key);

  return (
    <>
      <PageHeader crumb={t('tnt.crumb')} title={t('tnt.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('tnt.note')}</p>
        {error ? <ErrorLine error={error} onRetry={reload} /> : null}
        {loading ? <Loading /> : null}
        {data && data.length === 0 ? <p className="muted">{t('tnt.empty')}</p> : null}
        {data && data.length > 0 ? (
          <section className="card !p-0 overflow-hidden">
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('tnt.col.org')}</th>
                  <th>{t('tnt.col.type')}</th>
                  <th>{t('tnt.col.modules')}</th>
                  <th className="num !font-display">{t('tnt.col.members')}</th>
                  <th className="num !font-display">{t('tnt.col.farms')}</th>
                  <th className="num !font-display">{t('tnt.col.parcels')}</th>
                  <th>{t('tnt.col.created')}</th>
                  {mayOpen ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {data.map((o) => (
                  <tr key={o.id}>
                    <td className="font-semibold">{o.name}</td>
                    <td>{typeName(o.accountType)}</td>
                    <td className="font-mono text-xs"><Num>{o.modules.join(', ')}</Num></td>
                    <td className="num">{fmt(o.members, 0)}</td>
                    <td className="num">{fmt(o.farms, 0)}</td>
                    <td className="num">{fmt(o.parcels, 0)}</td>
                    <td className="font-mono text-xs"><Num>{fmtUtc(o.createdAt).slice(0, 10)}</Num></td>
                    {mayOpen ? <td><button type="button" className="zr-btn whitespace-nowrap" onClick={() => startViewing(o)}>{t('use.open')}</button></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </>
  );
}
