import type { ApiEnvironment } from "../config/env.validation";

export const AUTH_ENVIRONMENT = Symbol("AUTH_ENVIRONMENT");
export type AuthEnvironment = Pick<
  ApiEnvironment,
  | "nodeEnv"
  | "trustedOrigins"
  | "sessionTtlSeconds"
  | "passwordMinLength"
  | "loginRateLimitMax"
  | "loginRateLimitWindowSeconds"
  | "invitationDevTokenDelivery"
>;

export interface SafeUserIdentity {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginResult {
  user: SafeUserIdentity;
  rawSessionToken: string;
  expiresAt: Date;
}
