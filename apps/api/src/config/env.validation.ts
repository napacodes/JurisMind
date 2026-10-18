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
  publicWebUrl: string;
  passwordResetEmailEndpoint: string | null;
  passwordResetEmailApiKey: string | null;
  passwordResetEmailFrom: string | null;
  localPasswordResetSinkEnabled: boolean;
  localPasswordResetSinkKey: string | null;
}

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
  if (!localPasswordResetSinkEnabled && localPasswordResetSinkKey) {
    throw new Error("LOCAL_PASSWORD_RESET_SINK_KEY requires LOCAL_PASSWORD_RESET_SINK_ENABLED=true.");
  }
  const publicWebUrl = environment.PUBLIC_WEB_URL?.trim() || (nodeEnv === "production" ? "" : trustedOrigins[0]!);
  if (!publicWebUrl) throw new Error("PUBLIC_WEB_URL is required in production.");
  if (!trustedOrigins.includes(publicWebUrl)) throw new Error("PUBLIC_WEB_URL must exactly match an origin in TRUSTED_ORIGINS.");

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
    publicWebUrl,
    passwordResetEmailEndpoint,
    passwordResetEmailApiKey,
    passwordResetEmailFrom,
    localPasswordResetSinkEnabled,
    localPasswordResetSinkKey,
  };
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
