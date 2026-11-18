export type ActiveUserLoader = (userId: string) => Promise<boolean>;

const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 5_000;

/**
 * Signed sessions are stateless, so a suspended or deleted user would keep
 * working until the token expires. This small TTL cache lets us re-check the
 * `active` flag cheaply (one DB lookup per user per TTL, not per request).
 */
export class ActiveUserCache {
  private readonly entries = new Map<string, { active: boolean; expiresAt: number }>();

  public constructor(
    private readonly loader: ActiveUserLoader,
    private readonly ttlMs: number = DEFAULT_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  public async isActive(userId: string): Promise<boolean> {
    const current = this.now();
    const cached = this.entries.get(userId);
    if (cached && cached.expiresAt > current) return cached.active;

    const active = await this.loader(userId);
    if (this.entries.size >= MAX_ENTRIES) this.entries.clear();
    this.entries.set(userId, { active, expiresAt: current + this.ttlMs });
    return active;
  }

  /** Call after suspending / reactivating a user so the change applies at once. */
  public invalidate(userId: string): void {
    this.entries.delete(userId);
  }
}
