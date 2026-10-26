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
> & Partial<Pick<ApiEnvironment, "mfaEncryptionKey" | "lawyerCredentialEncryptionKey" | "publicWebUrl" | "passwordResetEmailEndpoint" | "passwordResetEmailApiKey" | "passwordResetEmailFrom" | "localPasswordResetSinkEnabled" | "localPasswordResetSinkKey" | "privateDocumentStorage" | "firmVerificationValidityDays" | "lawyerCredentialValidityDays" | "firmKycDocumentPolicy" | "lawyerCredentialDocumentPolicy">>;

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

export type LoginOutcome = LoginResult | { mfaRequired: true; rawChallengeToken: string; expiresAt: Date };
