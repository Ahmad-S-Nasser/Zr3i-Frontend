import { useEffect, useState } from 'react';
import { ApiError, fetchBlob } from '../api/client';

/**
 * Loads a file from a signed-in route as an object URL, for an image tag (a plain image link cannot carry the bearer token).
 * The URL is released when the path changes or the component goes away.
 */
export function useBlobUrl(path: string | null): { url: string | null; error: ApiError | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);

  useEffect(() => {
    if (path === null) {
      setUrl(null);
      setLoading(false);
      return;
    }
    let made: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBlob(path)
      .then((blob) => {
        if (cancelled) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setUrl(null);
        setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [path]);

  return { url, error, loading };
}
