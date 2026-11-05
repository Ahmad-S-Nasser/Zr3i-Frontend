import { useState } from 'react';
import { ApiError, api } from '../api/client';
import { can, useAuth } from '../auth/AuthProvider';
import { go } from '../router';
import { ErrorLine } from './ui';

/** Asks for a frozen report about this subject, then opens Reports where it appears when it is ready. Shown only to people who may ask. */
export function RequestReportButton({ kind, subjectId, season, label }: { kind: 'tranche' | 'farm_risk'; subjectId: string; season?: string; label: string }) {
  const { org } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  if (!org || !can(org.permissions, 'kernel:reports:write')) return null;

  async function ask() {
    if (!org) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/organisations/${org.id}/reports`, { method: 'POST', body: { kind, subjectId, season: season ?? null } });
      go('#/reports');
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="zr-btn" disabled={busy} onClick={ask}>{label}</button>
      {error ? <ErrorLine error={error} /> : null}
    </>
  );
}
