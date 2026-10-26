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
  private readonly registrationAttempts = new Map<string, Bucket>();

  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  isBlocked(identifier: string, remoteAddress: string, now = Date.now()): boolean {
    this.pruneExpired(now);
    return this.isBlockedIn(this.attempts, this.keysFor(identifier, remoteAddress), now);
  }

  recordFailure(identifier: string, remoteAddress: string, now = Date.now()): void {
    this.recordFailureIn(this.attempts, this.keysFor(identifier, remoteAddress), now);
  }

  isRegistrationBlocked(identifier: string, remoteAddress: string, now = Date.now()): boolean {
    this.pruneExpired(now);
    return this.isBlockedIn(this.registrationAttempts, this.keysFor(identifier, remoteAddress), now);
  }

  recordRegistrationFailure(identifier: string, remoteAddress: string, now = Date.now()): void {
    this.recordFailureIn(this.registrationAttempts, this.keysFor(identifier, remoteAddress), now);
  }

  clearRegistrationIdentifier(identifier: string): void {
    const identifierKey = createHash("sha256").update(identifier).digest("hex");
    this.registrationAttempts.delete(`email:${identifierKey}`);
  }

  private isBlockedIn(attempts: Map<string, Bucket>, keys: string[], now: number): boolean {
    let blocked = false;
    for (const key of keys) {
      const bucket = attempts.get(key);
      if (!bucket) continue;
      if (bucket.resetAt <= now) attempts.delete(key);
      else if (bucket.count >= this.environment.loginRateLimitMax) blocked = true;
    }
    return blocked;
  }

  private recordFailureIn(attempts: Map<string, Bucket>, keys: string[], now: number): void {
    this.pruneExpired(now);
    const resetAt = now + this.environment.loginRateLimitWindowSeconds * 1000;
    for (const key of keys) {
      const bucket = attempts.get(key);
      if (!bucket || bucket.resetAt <= now) attempts.set(key, { count: 1, resetAt });
      else bucket.count += 1;
    }
    if (this.attempts.size + this.registrationAttempts.size > 20_000) {
      this.pruneExpired(now, true);
      while (this.attempts.size + this.registrationAttempts.size > 20_000) {
        let oldestKey: string | undefined;
        let oldestMap: Map<string, Bucket> | undefined;
        let oldestResetAt = Number.POSITIVE_INFINITY;
        for (const map of [this.attempts, this.registrationAttempts]) {
          for (const [key, bucket] of map) {
            if (bucket.resetAt < oldestResetAt) {
              oldestKey = key;
              oldestMap = map;
              oldestResetAt = bucket.resetAt;
            }
          }
        }
        if (!oldestKey) break;
        oldestMap!.delete(oldestKey);
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
    if (!force && this.attempts.size + this.registrationAttempts.size < 5_000) return;
    for (const map of [this.attempts, this.registrationAttempts]) {
      for (const [key, bucket] of map) {
        if (bucket.resetAt <= now) map.delete(key);
      }
    }
  }
}
