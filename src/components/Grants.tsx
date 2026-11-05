import { useState } from 'react';
import { ApiError, api } from '../api/client';
import type { Grant } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { fmtUtc } from '../format';
import { useLang } from '../i18n/LangProvider';
import type { MessageKey } from '../i18n/messages';
import { ErrorLine, Num } from './ui';

/** The farmer's own permissions: who may read their data, for what and until when, each with a Withdraw action that takes effect on the next read. */
export function Grants({ grants, onChanged, empty }: { grants: Grant[]; onChanged: () => void; empty: MessageKey }) {
  const { t } = useLang();
  const { org } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  async function withdraw(id: string) {
    if (!org) return;
    setBusy(id);
    setError(null);
    try {
      await api(`/api/organisations/${org.id}/consents/${encodeURIComponent(id)}/withdraw`, { method: 'POST' });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(null);
    }
  }

  if (grants.length === 0) return <p className="muted">{t(empty)}</p>;
  return (
    <>
      {error ? <ErrorLine error={error} /> : null}
      <table className="zr-t">
        <thead>
          <tr>
            <th>{t('cons.col.org')}</th>
            <th>{t('cons.col.purpose')}</th>
            <th>{t('cons.col.until')}</th>
            <th>{t('cons.col.status')}</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {grants.map((g) => (
            <tr key={g.grantId}>
              <td className="font-semibold">{g.granteeName ?? g.granteeTenantId}</td>
              <td>{g.purpose}</td>
              <td className="font-mono text-xs"><Num>{fmtUtc(g.validUntil).slice(0, 10)}</Num></td>
              <td>{t(`cons.status.${g.status}` as MessageKey)}</td>
              <td>
                {g.status === 'active' || g.status === 'scheduled' ? (
                  <button type="button" className="zr-btn" disabled={busy !== null} onClick={() => void withdraw(g.grantId)}>
                    {busy === g.grantId ? t('cons.withdrawing') : t('cons.withdraw')}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
