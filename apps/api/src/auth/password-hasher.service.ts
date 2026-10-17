import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

const MAX_PASSWORD_LENGTH = 256;
const MAX_PASSWORD_BYTES = 1024;
const ACCEPTED_HASH_FORMAT = /^\$argon2id\$v=19\$m=19456,p=1,t=2\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/;

@Injectable()
export class PasswordHasherService {
  async hash(password: string, minimumLength: number): Promise<string> {
    this.assertValidPassword(password, minimumLength);
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      hashLength: 32,
    });
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    if (
      !this.isWithinMaximum(password) ||
      encodedHash.length > 255 ||
      !ACCEPTED_HASH_FORMAT.test(encodedHash)
    ) return false;
    try {
      return await argon2.verify(encodedHash, password);
    } catch {
      return false;
    }
  }

  assertValidPassword(password: string, minimumLength: number): void {
    if (
      !this.isWithinMaximum(password) ||
      password.length < minimumLength
    ) {
      throw new Error(`Password must be between ${minimumLength} and ${MAX_PASSWORD_LENGTH} characters.`);
    }
  }

  private isWithinMaximum(password: string): boolean {
    return (
      typeof password === "string" &&
      password.length <= MAX_PASSWORD_LENGTH &&
      Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES
    );
  }
}
