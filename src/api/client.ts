import { API_BASE } from '../config';

const TOKEN_KEY = 'zr3i.token';

/** A failed API call. `code` is the API's stable error code ("invalid_credentials"), or "network" when no answer came. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`${status} ${code}`);
  }
}

// The token lives for the browser session only; closing the tab signs the user out.
export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage can be blocked; the session then lasts until reload */
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called when a signed-in request comes back 401, so the app can return to sign-in. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method: init.method ?? 'GET',
      signal: init.signal,
      headers: {
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'network');
  }

  if (response.ok) return response.status === 204 ? (undefined as T) : ((await response.json()) as T);

  let code = 'unknown';
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) code = body.error;
  } catch {
    /* no JSON body */
  }

  if (response.status === 401 && token && code !== 'invalid_credentials') onUnauthorized?.();
  throw new ApiError(response.status, code);
}
