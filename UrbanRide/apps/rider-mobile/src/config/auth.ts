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

let currentSession: RiderSession | null = null;
const sessionListeners = new Set<() => void>();

function notifySessionListeners(): void {
  sessionListeners.forEach((listener) => listener());
}

export function subscribeToRiderSession(
  listener: () => void,
): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function setRiderSession(
  session: RiderSession,
): void {
  currentSession = session;
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
  if (!currentSession) {
    return;
  }

  currentSession = null;
  notifySessionListeners();
}
