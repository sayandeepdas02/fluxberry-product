'use client';

import { STORAGE_KEYS, setWorkspaceId } from './api-client';

export function clearLocalAuthState(): void {
  window.localStorage.removeItem(STORAGE_KEYS.testToken);
  setWorkspaceId(null);
}
