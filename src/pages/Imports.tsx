import { useEffect, useRef, useState } from 'react';
import { ApiError, api, download } from '../api/client';
import type { ImportBatch, ImportErrors } from '../api/types';
import { can, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Kpi, Loading, Num, PageHeader } from '../components/ui';
import { fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { messages, type MessageKey } from '../i18n/messages';

// The columns an import file may have (the API's ImportColumns.Known). The first three are required.
const TEMPLATE = ['parcel_external_id', 'farm_external_id', 'farm_name', 'parcel_label', 'governorate', 'markaz', 'village', 'season', 'declared_crop', 'declared_area_feddan', 'declared_sowing_date', 'boundary_geojson'];
const BUSY = ['uploaded', 'validating', 'commit_queued', 'committing'];

/** Bulk import in four steps: upload, check, fix or skip, commit. The worker does the work; this page polls the batch. */
export function Imports() {
  const { t } = useLang();
  const { org } = useAuth();
  const canWrite = org !== null && can(org.permissions, 'kernel:imports:write');
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [errors, setErrors] = useState<ImportErrors | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const history = useApi<ImportBatch[]>(org ? `/api/organisations/${org.id}/imports` : null);

  const base = org ? `/api/organisations/${org.id}/imports` : '';
  const fail = (e: unknown) => setError(e instanceof ApiError ? e : new ApiError(0, 'network'));

  // While the worker is busy, ask again every 1.5 seconds.
  useEffect(() => {
    if (!batch || !BUSY.includes(batch.status)) return;
    const timer = window.setTimeout(() => {
      api<ImportBatch>(`${base}/${batch.id}`).then(setBatch).catch(fail);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [batch, base]);

  useEffect(() => {
    if (batch?.status === 'validated' && batch.invalidRows > 0) api<ImportErrors>(`${base}/${batch.id}/errors?pageSize=100`).then(setErrors).catch(fail);
    else setErrors(null);
    if (batch && ['committed', 'discarded', 'failed'].includes(batch.status)) history.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, batch?.id]);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      setBatch(await api<ImportBatch>(`${base}?fileName=${encodeURIComponent(file.name)}`, { method: 'POST', raw: file }));
    } catch (e) {
      fail(e);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  async function act(path: 'commit' | 'discard') {
    if (!batch) return;
    setError(null);
    try {
      setBatch(await api<ImportBatch>(`${base}/${batch.id}/${path}`, { method: 'POST' }));
    } catch (e) {
      fail(e);
    }
  }

  function template() {
    const blob = new Blob([TEMPLATE.join(',') + '\r\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zr3i-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const step = !batch ? 1 : batch.status === 'validated' ? (batch.invalidRows > 0 ? 3 : 4) : ['committed', 'commit_queued', 'committing'].includes(batch.status) ? 4 : 2;

  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={t('imp.title')} />
      <div className="flex flex-col gap-4">
        <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('imp.title')}>
          {[1, 2, 3, 4].map((n) => (
            <li key={n} aria-current={step === n ? 'step' : undefined} className={`zr-chip ${step === n ? '!bg-zr-mist !border-brand font-semibold' : ''}`}>
              <Num>{n}</Num>&nbsp;{t(`imp.step.${n}` as MessageKey)}
            </li>
          ))}
        </ol>

        {error ? <ErrorLine error={error} /> : null}
        {!canWrite ? <div className="banner neutral" role="note"><span>{t('imp.readOnly')}</span></div> : null}

        {!batch ? (
          <section className="card flex flex-col items-start gap-3">
            <p className="m-0">{t('imp.drop')}</p>
            <p className="muted m-0 text-sm">{t('imp.hint')}</p>
            <div className="flex flex-wrap gap-2">
              <input ref={input} type="file" accept=".csv,.geojson,.json,text/csv,application/json" hidden onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
              <button type="button" className="zr-btn primary" disabled={!canWrite || uploading} onClick={() => input.current?.click()}>
                {uploading ? t('imp.uploading') : t('imp.choose')}
              </button>
              <button type="button" className="zr-btn" onClick={template}>{t('imp.template')}</button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {BUSY.includes(batch.status) ? <p role="status" className="muted">{batch.status === 'uploaded' || batch.status === 'validating' ? t('imp.checking') : t('imp.committing')}</p> : null}
            {batch.status === 'failed' ? <div className="banner neutral" role="note"><span>{t('imp.failed')}</span></div> : null}
            {batch.status === 'discarded' ? <div className="banner neutral" role="note"><span>{t('imp.discarded')}</span></div> : null}
            {batch.status === 'committed' ? (
              <div className="banner info" role="status"><span>{t('imp.committed', { created: batch.created, updated: batch.updated, unchanged: batch.unchanged, failed: batch.failed })}</span></div>
            ) : null}

            {batch.fileErrors.length > 0 ? (
              <section className="card">
                <h2 className="title">{t('imp.fileErrors')}</h2>
                <ul className="m-0 list-disc ps-5 font-mono text-sm" dir="ltr">
                  {batch.fileErrors.map((c) => (<li key={c}>{c}</li>))}
                </ul>
              </section>
            ) : null}

            {batch.totalRows > 0 ? (
              <div className="grid grid-cols-3 gap-4 sm:max-w-2xl">
                <Kpi label={t('imp.rowsRead')} value={<Num>{batch.totalRows.toLocaleString('en-US')}</Num>} />
                <Kpi label={t('imp.validRows')} value={<Num>{batch.validRows.toLocaleString('en-US')}</Num>} />
                <Kpi label={t('imp.invalidRows')} value={<Num>{batch.invalidRows.toLocaleString('en-US')}</Num>} />
              </div>
            ) : null}

            {errors ? (
              <section className="card !p-0 overflow-hidden">
                <div className="px-4 py-3">
                  <h2 className="title">{t('imp.errors.title')}</h2>
                  <p className="muted m-0 text-sm">{t('imp.errors.hint', { shown: errors.rows.length, total: batch.invalidRows })}</p>
                </div>
                <table className="zr-t">
                  <thead>
                    <tr>
                      <th className="num !font-display">{t('imp.col.line')}</th>
                      <th>{t('imp.col.parcel')}</th>
                      <th>{t('imp.col.farm')}</th>
                      <th>{t('imp.col.problem')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.rows.map((r) => (
                      <tr key={r.line}>
                        <td className="num"><Num>{r.line}</Num></td>
                        <td className="font-mono text-xs"><Num>{r.parcelExternalId}</Num></td>
                        <td className="font-mono text-xs"><Num>{r.farmExternalId}</Num></td>
                        <td className="font-mono text-xs" dir="ltr">{r.errors.map((e) => `${e.field}: ${e.code}`).join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {batch.status === 'validated' ? (
                <>
                  <button type="button" className="zr-btn primary" disabled={!canWrite || batch.validRows === 0} onClick={() => void act('commit')}>
                    {t('imp.commit', { n: batch.validRows })}
                  </button>
                  <button type="button" className="zr-btn" disabled={!canWrite} onClick={() => void act('discard')}>{t('imp.discard')}</button>
                  {batch.invalidRows > 0 ? (
                    <button type="button" className="zr-btn" onClick={() => void download(`${base}/${batch.id}/errors.csv`, `import-${batch.id}-errors.csv`).catch(fail)}>
                      {t('imp.errorsCsv')}
                    </button>
                  ) : null}
                </>
              ) : null}
              {['committed', 'discarded', 'failed'].includes(batch.status) ? (
                <button type="button" className="zr-btn" onClick={() => { setBatch(null); setErrors(null); }}>{t('imp.another')}</button>
              ) : null}
            </div>
          </section>
        )}

        <section className="card !p-0 overflow-hidden" aria-labelledby="hist">
          <h2 id="hist" className="title px-4 py-3">{t('imp.history')}</h2>
          {history.loading && !history.data ? <div className="px-4 pb-3"><Loading /></div> : null}
          {history.data && history.data.length === 0 ? <p className="muted px-4 pb-3">{t('imp.history.none')}</p> : null}
          {history.data && history.data.length > 0 ? (
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('imp.col.file')}</th>
                  <th>{t('imp.col.status')}</th>
                  <th className="num !font-display">{t('imp.col.rows')}</th>
                  <th>{t('imp.col.when')}</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs"><Num>{b.fileName}</Num></td>
                    <td>{`imp.status.${b.status}` in messages.en ? t(`imp.status.${b.status}` as MessageKey) : b.status}</td>
                    <td className="num"><Num>{b.totalRows}</Num></td>
                    <td className="font-mono text-xs"><Num>{fmtUtc(b.createdAt)}</Num></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </>
  );
}
