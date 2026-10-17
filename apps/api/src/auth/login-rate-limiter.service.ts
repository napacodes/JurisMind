import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "./auth.types";

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginRateLimiterService {
  private readonly attempts = new Map<string, Bucket>();

  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  isBlocked(identifier: string, remoteAddress: string, now = Date.now()): boolean {
    this.pruneExpired(now);
    return this.keysFor(identifier, remoteAddress).some(
      (key) => (this.attempts.get(key)?.count ?? 0) >= this.environment.loginRateLimitMax,
    );
  }

  recordFailure(identifier: string, remoteAddress: string, now = Date.now()): void {
    this.pruneExpired(now);
    const resetAt = now + this.environment.loginRateLimitWindowSeconds * 1000;
    for (const key of this.keysFor(identifier, remoteAddress)) {
      const bucket = this.attempts.get(key);
      if (!bucket || bucket.resetAt <= now) this.attempts.set(key, { count: 1, resetAt });
      else bucket.count += 1;
    }
    if (this.attempts.size > 20_000) {
      this.pruneExpired(now, true);
      while (this.attempts.size > 20_000) {
        let oldestKey: string | undefined;
        let oldestResetAt = Number.POSITIVE_INFINITY;
        for (const [key, bucket] of this.attempts) {
          if (bucket.resetAt < oldestResetAt) {
            oldestKey = key;
            oldestResetAt = bucket.resetAt;
          }
        }
        if (!oldestKey) break;
        this.attempts.delete(oldestKey);
      }
    }
  }

  clearIdentifier(identifier: string): void {
    const identifierKey = createHash("sha256").update(identifier).digest("hex");
    this.attempts.delete(`email:${identifierKey}`);
  }

  private keysFor(identifier: string, remoteAddress: string): string[] {
    const identifierKey = createHash("sha256").update(identifier).digest("hex");
    return [`email:${identifierKey}`, `ip:${remoteAddress}`];
  }

  private pruneExpired(now: number, force = false): void {
    if (!force && this.attempts.size < 5_000) return;
    for (const [key, bucket] of this.attempts) {
      if (bucket.resetAt <= now) this.attempts.delete(key);
    }
  }
}
