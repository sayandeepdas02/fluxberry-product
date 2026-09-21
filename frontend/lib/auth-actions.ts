'use client';

import { STORAGE_KEYS, setWorkspaceId } from './api-client';

export function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://safe-next.invalid');
    return url.origin === 'https://safe-next.invalid' ? value : null;
  } catch {
    return null;
  }
}

export function clearLocalAuthState(): void {
  window.localStorage.removeItem(STORAGE_KEYS.testToken);
  setWorkspaceId(null);
}
