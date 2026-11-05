import { useState } from 'react';
import { fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { useLang } from '../i18n/LangProvider';

interface MethodSummary {
  methodId: string;
  name: string;
  version: number;
  state: string;
  frozenAt: string | null;
  sealSha256: string | null;
  parameters: Record<string, number>;
}

interface MethodDetail {
  sealVerified: boolean | null;
  parameters: { key: string; value: string | null; unit: string | null; status: string; source: string | null; note: string | null }[];
}

/** The method registry: every method and version, its state, and (on request) its parameters and how settled each is. Read-only here. */
export function Methods() {
  const { t } = useLang();
  const { data, error, loading, reload } = useApi<MethodSummary[]>('/api/methods');
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <PageHeader crumb={t('methods.crumb')} title={t('methods.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('methods.intro')}</p>
        {error ? <ErrorLine error={error} onRetry={reload} /> : null}
        {loading ? <Loading /> : null}
        {data && data.length === 0 ? <p className="muted">{t('methods.empty')}</p> : null}

        {data && data.length > 0 ? (
          <section className="card !p-0 overflow-hidden">
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('methods.col.method')}</th>
                  <th className="num !font-display">{t('methods.col.version')}</th>
                  <th>{t('methods.col.state')}</th>
                  <th>{t('methods.col.frozen')}</th>
                  <th>{t('methods.col.parameters')}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.map((m) => {
                  const id = `${m.methodId}@${m.version}`;
                  return (
                    <MethodRow key={id} m={m} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </>
  );
}

function MethodRow({ m, open, onToggle }: { m: MethodSummary; open: boolean; onToggle: () => void }) {
  const { t } = useLang();
  const detail = useApi<MethodDetail>(open ? `/api/methods/${encodeURIComponent(m.methodId)}?version=${m.version}` : null);
  const state = m.state === 'frozen' ? t('methods.state.frozen') : m.state === 'draft' ? t('methods.state.draft') : m.state;

  return (
    <>
      <tr>
        <td>
          <div className="font-semibold"><Num>{m.methodId}</Num></div>
          <div className="muted text-sm">{m.name}</div>
        </td>
        <td className="num"><Num>{m.version}</Num></td>
        <td>{state}</td>
        <td className="font-mono text-xs">{m.frozenAt ? <Num>{fmtUtc(m.frozenAt)}</Num> : t('common.none')}</td>
        <td className="text-sm">
          {Object.entries(m.parameters).map(([status, n]) => (
            <span key={status} className="me-3 whitespace-nowrap"><Num>{status}</Num> <Num>{n}</Num></span>
          ))}
        </td>
        <td>
          <button type="button" className="zr-btn" aria-expanded={open} onClick={onToggle}>
            {open ? t('methods.hide') : t('methods.show')}
          </button>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} className="!bg-sunken">
            {detail.loading ? <Loading /> : null}
            {detail.error ? <ErrorLine error={detail.error} onRetry={detail.reload} /> : null}
            {detail.data ? (
              <>
                <p className="m-0 mb-2 text-sm">
                  {t('methods.seal')}: <span className="font-mono"><Num>{m.sealSha256 ? m.sealSha256.slice(0, 16) + '…' : t('common.none')}</Num></span>
                  {detail.data.sealVerified === null ? null : <> · {detail.data.sealVerified ? t('methods.sealVerified') : '⚠'}</>}
                </p>
                <table className="zr-t">
                  <thead>
                    <tr>
                      <th>{t('methods.col.key')}</th>
                      <th>{t('col.value')}</th>
                      <th>{t('methods.col.unit')}</th>
                      <th>{t('methods.col.status')}</th>
                      <th>{t('methods.col.source')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.parameters.map((p) => (
                      <tr key={p.key}>
                        <td className="font-mono text-xs"><Num>{p.key}</Num></td>
                        <td className="font-mono text-xs"><Num>{p.value ?? '—'}</Num></td>
                        <td className="text-sm">{p.unit ?? ''}</td>
                        <td className="text-sm"><Num>{p.status}</Num></td>
                        <td className="text-sm">{p.source ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
