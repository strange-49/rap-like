/**
 * Stops hammering a dependency that is clearly down.
 *
 * After `failureThreshold` consecutive failures the breaker OPENS for
 * `cooldownMs`: callers skip the slow, doomed network call and use their
 * fallback immediately. When the cooldown ends the next call is let through as
 * a probe; a success closes the breaker again.
 *
 * Without it, an unreachable routing/geocoding server makes EVERY request wait
 * for the full timeout (4 s here), which piles up and slows the whole API.
 */
export class CircuitBreaker {
  private consecutiveFailures = 0;
  private openUntil = 0;

  public constructor(
    private readonly options: { failureThreshold: number; cooldownMs: number },
    private readonly now: () => number = Date.now,
  ) {}

  /** True while calls should be skipped. */
  public isOpen(): boolean {
    return this.now() < this.openUntil;
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  public recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.openUntil = this.now() + this.options.cooldownMs;
      this.consecutiveFailures = 0;
    }
  }
}
