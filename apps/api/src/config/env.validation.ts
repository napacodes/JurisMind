export interface ApiEnvironment {
  port: number;
  databaseUrl: string;
  nodeEnv: "development" | "test" | "production";
  trustedOrigins: string[];
  sessionTtlSeconds: number;
  passwordMinLength: number;
  loginRateLimitMax: number;
  loginRateLimitWindowSeconds: number;
  invitationDevTokenDelivery: boolean;
  mfaEncryptionKey: Buffer | null;
  lawyerCredentialEncryptionKey: Buffer | null;
  publicWebUrl: string;
  passwordResetEmailEndpoint: string | null;
  passwordResetEmailApiKey: string | null;
  passwordResetEmailFrom: string | null;
  localPasswordResetSinkEnabled: boolean;
  localPasswordResetSinkKey: string | null;
  privateDocumentStorage: PrivateDocumentStorageEnvironment;
  firmVerificationValidityDays: number | null;
  lawyerCredentialValidityDays: number | null;
  firmKycDocumentPolicy: FirmKycDocumentPolicy;
  lawyerCredentialDocumentPolicy: LawyerCredentialDocumentPolicy;
}

export type PrivateDocumentStorageEnvironment =
  | { driver: "local" }
  | { driver: "s3"; endpoint: string | null; region: string; bucket: string; accessKeyId: string; secretAccessKey: string };
export type FirmKycDocumentType = "REGISTRATION" | "AUTHORITY";
export type FirmKycDocumentPolicy = { default: FirmKycDocumentType[]; byJurisdictionAndLegalForm: Record<string, FirmKycDocumentType[]> };
export type LawyerCredentialDocumentPolicy = { default: boolean; byJurisdiction: Record<string, boolean> };

/** Validate required runtime configuration without opening a database connection. */
export function validateEnvironment(
  environment: NodeJS.ProcessEnv,
): ApiEnvironment {
  const rawPort = environment.PORT ?? "4000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. See apps/api/.env.example.");
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (
    !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
    !parsedDatabaseUrl.hostname ||
    !parsedDatabaseUrl.pathname.slice(1)
  ) {
    throw new Error(
      "DATABASE_URL must use postgres:// or postgresql:// and include a host and database name.",
    );
  }

  const rawNodeEnv = environment.NODE_ENV;
  if (!rawNodeEnv || !["development", "test", "production"].includes(rawNodeEnv)) {
    throw new Error("NODE_ENV must be explicitly set to development, test, or production.");
  }
  const nodeEnv = rawNodeEnv as ApiEnvironment["nodeEnv"];

  const trustedOriginsRaw = environment.TRUSTED_ORIGINS?.trim();
  if (!trustedOriginsRaw) {
    throw new Error("TRUSTED_ORIGINS is required and must list exact trusted web origins.");
  }
  const trustedOrigins = [...new Set(trustedOriginsRaw.split(",").map((origin) => origin.trim()))];
  for (const origin of trustedOrigins) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error("TRUSTED_ORIGINS must contain valid origins without paths or wildcards.");
    }
    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin ||
      origin.includes("*") ||
      (nodeEnv === "production" && parsedOrigin.protocol !== "https:")
    ) {
      throw new Error("TRUSTED_ORIGINS must contain exact origins; production origins must use HTTPS.");
    }
  }

  const sessionTtlSeconds = parseBoundedInteger(
    environment.SESSION_TTL_SECONDS,
    "SESSION_TTL_SECONDS",
    60,
    2_592_000,
  );
  const passwordMinLength = parseBoundedInteger(
    environment.PASSWORD_MIN_LENGTH,
    "PASSWORD_MIN_LENGTH",
    8,
    64,
  );
  const loginRateLimitMax = parseBoundedInteger(
    environment.LOGIN_RATE_LIMIT_MAX,
    "LOGIN_RATE_LIMIT_MAX",
    1,
    100,
  );
  const loginRateLimitWindowSeconds = parseBoundedInteger(
    environment.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    "LOGIN_RATE_LIMIT_WINDOW_SECONDS",
    60,
    86_400,
  );

  const invitationDevTokenDelivery = environment.INVITATION_DEV_TOKEN_DELIVERY === "true";
  if (environment.INVITATION_DEV_TOKEN_DELIVERY && !["true", "false"].includes(environment.INVITATION_DEV_TOKEN_DELIVERY)) {
    throw new Error("INVITATION_DEV_TOKEN_DELIVERY must be true or false when set.");
  }
  if (invitationDevTokenDelivery && nodeEnv !== "development") {
    throw new Error("INVITATION_DEV_TOKEN_DELIVERY is available only in development.");
  }

  const rawMfaKey = environment.MFA_ENCRYPTION_KEY?.trim();
  let mfaEncryptionKey: Buffer | null = null;
  if (rawMfaKey) {
    mfaEncryptionKey = Buffer.from(rawMfaKey, "base64");
    if (mfaEncryptionKey.length !== 32 || mfaEncryptionKey.toString("base64") !== rawMfaKey) {
      throw new Error("MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
    }
  }
  if (nodeEnv === "production" && !mfaEncryptionKey) {
    throw new Error("MFA_ENCRYPTION_KEY is required in production.");
  }

  const rawCredentialKey = environment.LAWYER_CREDENTIAL_ENCRYPTION_KEY?.trim();
  let lawyerCredentialEncryptionKey: Buffer | null = null;
  if (rawCredentialKey) {
    lawyerCredentialEncryptionKey = Buffer.from(rawCredentialKey, "base64");
    if (lawyerCredentialEncryptionKey.length !== 32 || lawyerCredentialEncryptionKey.toString("base64") !== rawCredentialKey) {
      throw new Error("LAWYER_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
    }
  }
  if (nodeEnv === "production" && !lawyerCredentialEncryptionKey) {
    throw new Error("LAWYER_CREDENTIAL_ENCRYPTION_KEY is required in production.");
  }

  const emailConfig = [environment.PASSWORD_RESET_EMAIL_ENDPOINT, environment.PASSWORD_RESET_EMAIL_API_KEY, environment.PASSWORD_RESET_EMAIL_FROM];
  const configuredEmailParts = emailConfig.filter((value) => Boolean(value?.trim())).length;
  if (configuredEmailParts !== 0 && configuredEmailParts !== 3) {
    throw new Error("Password reset email endpoint, API key, and sender must be configured together.");
  }
  let passwordResetEmailEndpoint: string | null = null;
  let passwordResetEmailApiKey: string | null = null;
  let passwordResetEmailFrom: string | null = null;
  if (configuredEmailParts === 3) {
    const endpointValue = environment.PASSWORD_RESET_EMAIL_ENDPOINT!.trim();
    let endpoint: URL;
    try { endpoint = new URL(endpointValue); } catch { throw new Error("PASSWORD_RESET_EMAIL_ENDPOINT must be a valid HTTPS URL."); }
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash) {
      throw new Error("PASSWORD_RESET_EMAIL_ENDPOINT must be HTTPS without credentials or fragment.");
    }
    const sender = environment.PASSWORD_RESET_EMAIL_FROM!.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) throw new Error("PASSWORD_RESET_EMAIL_FROM must be a valid email address.");
    passwordResetEmailEndpoint = endpoint.toString();
    passwordResetEmailApiKey = environment.PASSWORD_RESET_EMAIL_API_KEY!.trim();
    passwordResetEmailFrom = sender;
  }
  if (nodeEnv === "production" && configuredEmailParts !== 3) {
    throw new Error("Password reset email delivery must be configured in production.");
  }
  const rawLocalResetSinkEnabled = environment.LOCAL_PASSWORD_RESET_SINK_ENABLED;
  if (rawLocalResetSinkEnabled && !["true", "false"].includes(rawLocalResetSinkEnabled)) {
    throw new Error("LOCAL_PASSWORD_RESET_SINK_ENABLED must be true or false when set.");
  }
  const localPasswordResetSinkEnabled = rawLocalResetSinkEnabled === "true";
  const localPasswordResetSinkKey = environment.LOCAL_PASSWORD_RESET_SINK_KEY?.trim() || null;
  if (localPasswordResetSinkEnabled && nodeEnv !== "development") {
    throw new Error("The local password-reset sink is available only in development.");
  }
  if (localPasswordResetSinkEnabled && (!localPasswordResetSinkKey || Buffer.byteLength(localPasswordResetSinkKey) < 32)) {
    throw new Error("LOCAL_PASSWORD_RESET_SINK_KEY must contain at least 32 bytes when the local sink is enabled.");
  }
  if (localPasswordResetSinkEnabled && configuredEmailParts !== 0) {
    throw new Error("The local password-reset sink cannot be combined with an email delivery provider.");
  }
  const storageDriver = environment.PRIVATE_DOCUMENT_STORAGE_DRIVER?.trim() || "local";
  if (storageDriver !== "local" && storageDriver !== "s3") {
    throw new Error("PRIVATE_DOCUMENT_STORAGE_DRIVER must be local or s3.");
  }
  if (nodeEnv === "production" && storageDriver !== "s3") {
    throw new Error("PRIVATE_DOCUMENT_STORAGE_DRIVER=s3 is required in production.");
  }
  const storageEndpointValue = environment.PRIVATE_DOCUMENT_S3_ENDPOINT?.trim() || null;
  const storageRegion = environment.PRIVATE_DOCUMENT_S3_REGION?.trim() || "";
  const storageBucket = environment.PRIVATE_DOCUMENT_S3_BUCKET?.trim() || "";
  const storageAccessKeyId = environment.PRIVATE_DOCUMENT_S3_ACCESS_KEY_ID?.trim() || "";
  const storageSecretAccessKey = environment.PRIVATE_DOCUMENT_S3_SECRET_ACCESS_KEY?.trim() || "";
  const storageAnyS3Config = Boolean(storageEndpointValue || storageRegion || storageBucket || storageAccessKeyId || storageSecretAccessKey);
  let privateDocumentStorage: PrivateDocumentStorageEnvironment = { driver: "local" };
  if (storageDriver === "s3" || storageAnyS3Config) {
    if (storageDriver !== "s3" || !storageRegion || !storageBucket || !storageAccessKeyId || !storageSecretAccessKey) {
      throw new Error("S3 document storage requires driver=s3, region, bucket, access key, and secret key.");
    }
    if (storageBucket.length > 63 || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(storageBucket)
      || storageBucket.includes("..") || /^\d+\.\d+\.\d+\.\d+$/.test(storageBucket)) {
      throw new Error("PRIVATE_DOCUMENT_S3_BUCKET must be a valid DNS-style bucket name.");
    }
    let endpoint: string | null = null;
    if (storageEndpointValue) {
      let parsed: URL;
      try { parsed = new URL(storageEndpointValue); } catch { throw new Error("PRIVATE_DOCUMENT_S3_ENDPOINT must be a valid HTTPS endpoint."); }
      if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")
        || (nodeEnv === "production" && parsed.protocol !== "https:")
        || (nodeEnv !== "production" && !["https:", "http:"].includes(parsed.protocol))) {
        throw new Error("PRIVATE_DOCUMENT_S3_ENDPOINT must be an origin-only HTTPS endpoint in production.");
      }
      endpoint = parsed.origin;
    }
    privateDocumentStorage = { driver: "s3", endpoint, region: storageRegion, bucket: storageBucket,
      accessKeyId: storageAccessKeyId, secretAccessKey: storageSecretAccessKey };
  }
  if (!localPasswordResetSinkEnabled && localPasswordResetSinkKey) {
    throw new Error("LOCAL_PASSWORD_RESET_SINK_KEY requires LOCAL_PASSWORD_RESET_SINK_ENABLED=true.");
  }
  const publicWebUrl = environment.PUBLIC_WEB_URL?.trim() || (nodeEnv === "production" ? "" : trustedOrigins[0]!);
  if (!publicWebUrl) throw new Error("PUBLIC_WEB_URL is required in production.");
  if (!trustedOrigins.includes(publicWebUrl)) throw new Error("PUBLIC_WEB_URL must exactly match an origin in TRUSTED_ORIGINS.");

  const firmVerificationValidityDays = parseOptionalPolicyDays(environment.FIRM_VERIFICATION_VALIDITY_DAYS, "FIRM_VERIFICATION_VALIDITY_DAYS");
  const lawyerCredentialValidityDays = parseOptionalPolicyDays(environment.LAWYER_CREDENTIAL_VALIDITY_DAYS, "LAWYER_CREDENTIAL_VALIDITY_DAYS");
  const firmKycDocumentPolicy = parseFirmKycDocumentPolicy(environment.FIRM_KYC_DOCUMENT_POLICY_JSON);
  const lawyerCredentialDocumentPolicy = parseLawyerDocumentPolicy(environment.LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON);

  return {
    port,
    databaseUrl,
    nodeEnv,
    trustedOrigins,
    sessionTtlSeconds,
    passwordMinLength,
    loginRateLimitMax,
    loginRateLimitWindowSeconds,
    invitationDevTokenDelivery,
    mfaEncryptionKey,
    lawyerCredentialEncryptionKey,
    publicWebUrl,
    passwordResetEmailEndpoint,
    passwordResetEmailApiKey,
    passwordResetEmailFrom,
    localPasswordResetSinkEnabled,
    localPasswordResetSinkKey,
    privateDocumentStorage,
    firmVerificationValidityDays,
    lawyerCredentialValidityDays,
    firmKycDocumentPolicy,
    lawyerCredentialDocumentPolicy,
  };
}

function parseOptionalPolicyDays(value: string | undefined, name: string): number | null {
  if (value === undefined || value.trim() === "") return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error(`${name} must be an integer between 1 and 3650 when configured.`);
  return days;
}

const defaultFirmDocumentPolicy: FirmKycDocumentPolicy = { default: ["REGISTRATION", "AUTHORITY"], byJurisdictionAndLegalForm: {} };
const defaultLawyerDocumentPolicy: LawyerCredentialDocumentPolicy = { default: true, byJurisdiction: {} };

export function firmKycDocumentRequirementsFor(policy: FirmKycDocumentPolicy | undefined, jurisdiction: string, legalForm: string): FirmKycDocumentType[] {
  const active = policy ?? defaultFirmDocumentPolicy;
  const normalizedKey = `${normalizePolicyKey(jurisdiction)}|${normalizePolicyKey(legalForm)}`;
  return [...(active.byJurisdictionAndLegalForm[normalizedKey] ?? active.default)];
}

export function lawyerCredentialDocumentRequiredFor(policy: LawyerCredentialDocumentPolicy | undefined, jurisdiction: string): boolean {
  const active = policy ?? defaultLawyerDocumentPolicy;
  return active.byJurisdiction[normalizePolicyKey(jurisdiction)] ?? active.default;
}

function normalizePolicyKey(value: string): string { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US"); }

function parseFirmKycDocumentPolicy(raw: string | undefined): FirmKycDocumentPolicy {
  if (!raw?.trim()) return defaultFirmDocumentPolicy;
  if (raw.length > 32_000) throw new Error("FIRM_KYC_DOCUMENT_POLICY_JSON exceeds the configuration size limit.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("FIRM_KYC_DOCUMENT_POLICY_JSON must be valid JSON."); }
  if (!isPlainRecord(value) || Object.keys(value).some((key) => !["default", "byJurisdictionAndLegalForm"].includes(key))) throw new Error("FIRM_KYC_DOCUMENT_POLICY_JSON has an invalid shape.");
  const defaultDocuments = parseFirmDocumentList(value.default, true);
  const rawOverrides = value.byJurisdictionAndLegalForm ?? {};
  if (!isPlainRecord(rawOverrides) || Object.keys(rawOverrides).length > 200) throw new Error("Firm document policy overrides are invalid.");
  const overrides: Record<string, FirmKycDocumentType[]> = {};
  for (const [rawKey, documents] of Object.entries(rawOverrides)) {
    const parts = rawKey.split("|");
    if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim() || parts[0].length > 120 || parts[1].length > 120) throw new Error("Firm document policy keys must use bounded jurisdiction|legal-form values.");
    const key = `${normalizePolicyKey(parts[0])}|${normalizePolicyKey(parts[1])}`;
    if (overrides[key]) throw new Error("Firm document policy contains duplicate normalized keys.");
    overrides[key] = parseFirmDocumentList(documents, false);
  }
  return { default: defaultDocuments, byJurisdictionAndLegalForm: overrides };
}

function parseFirmDocumentList(value: unknown, requireAtLeastOne: boolean): FirmKycDocumentType[] {
  if (!Array.isArray(value) || value.length > 2 || (requireAtLeastOne && value.length === 0)
    || value.some((item) => item !== "REGISTRATION" && item !== "AUTHORITY") || new Set(value).size !== value.length) {
    throw new Error("Firm document policy lists may contain REGISTRATION and AUTHORITY only.");
  }
  return [...value] as FirmKycDocumentType[];
}

function parseLawyerDocumentPolicy(raw: string | undefined): LawyerCredentialDocumentPolicy {
  if (!raw?.trim()) return defaultLawyerDocumentPolicy;
  if (raw.length > 32_000) throw new Error("LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON exceeds the configuration size limit.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON must be valid JSON."); }
  if (!isPlainRecord(value) || Object.keys(value).some((key) => !["default", "byJurisdiction"].includes(key)) || typeof value.default !== "boolean") throw new Error("LAWYER_CREDENTIAL_DOCUMENT_POLICY_JSON has an invalid shape.");
  const rawOverrides = value.byJurisdiction ?? {};
  if (!isPlainRecord(rawOverrides) || Object.keys(rawOverrides).length > 200
    || Object.entries(rawOverrides).some(([key, required]) => !key.trim() || key.length > 120 || typeof required !== "boolean")) throw new Error("Lawyer document policy overrides are invalid.");
  const overrides: Record<string, boolean> = {};
  for (const [key, required] of Object.entries(rawOverrides)) {
    const normalizedKey = normalizePolicyKey(key);
    if (overrides[normalizedKey] !== undefined) throw new Error("Lawyer document policy contains duplicate normalized keys.");
    overrides[normalizedKey] = required as boolean;
  }
  return { default: value.default, byJurisdiction: overrides };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBoundedInteger(
  value: string | undefined,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}
