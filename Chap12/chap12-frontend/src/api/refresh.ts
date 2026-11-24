import { authApi } from './endpoints';
import { setAccessToken } from './token';

const REFRESH_TIMEOUT_MS = 10_000;

let refreshPromise: Promise<boolean> | null = null;

export async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = performRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function performRefresh(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const { accessToken } = await authApi.refresh(controller.signal);
    setAccessToken(accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
