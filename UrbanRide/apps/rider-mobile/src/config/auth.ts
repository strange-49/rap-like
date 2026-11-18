
import * as SecureStore from 'expo-secure-store';

export type RiderPrincipal = {
  subjectId: string;
  role: 'RIDER';
  tenant: {
    tenantId: string;
  } | null;
};

export type RiderSession = {
  token: string;
  expiresAt: string;
  principal: RiderPrincipal;
};

const SESSION_STORAGE_KEY = 'urbanride.rider.session';

let currentSession: RiderSession | null = null;
const sessionListeners = new Set<() => void>();

function notifySessionListeners(): void {
  sessionListeners.forEach((listener) => listener());
}

function isUsableSession(value: unknown): value is RiderSession {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<RiderSession>;

  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.expiresAt === 'string' &&
    Number.isFinite(Date.parse(candidate.expiresAt)) &&
    Date.parse(candidate.expiresAt) > Date.now() &&
    typeof candidate.principal?.subjectId === 'string' &&
    candidate.principal.subjectId.length > 0 &&
    candidate.principal.role === 'RIDER'
  );
}

/** Call once at startup, before deciding whether to show the login screen. */
export async function restoreRiderSession(): Promise<void> {
  if (currentSession) return;

  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);

    if (isUsableSession(parsed)) {
      currentSession = parsed;
      notifySessionListeners();
    } else {
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    }
  } catch {
    // A corrupt or unreadable entry means the rider signs in again.
  }
}

export function subscribeToRiderSession(
  listener: () => void,
): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function setRiderSession(session: RiderSession): void {
  currentSession = session;

  void SecureStore.setItemAsync(
    SESSION_STORAGE_KEY,
    JSON.stringify(session),
  ).catch(() => undefined);

  notifySessionListeners();
}

export function getRiderSession(): RiderSession | null {
  if (
    currentSession &&
    (!Number.isFinite(Date.parse(currentSession.expiresAt)) ||
      Date.parse(currentSession.expiresAt) <= Date.now())
  ) {
    clearRiderSession();
  }

  return currentSession;
}

export function getRiderAuthToken(): string | null {
  return getRiderSession()?.token ?? null;
}

export function clearRiderSession(): void {
  const hadSession = currentSession !== null;
  currentSession = null;

  void SecureStore.deleteItemAsync(SESSION_STORAGE_KEY).catch(
    () => undefined,
  );

  if (hadSession) {
    notifySessionListeners();
  }
}
