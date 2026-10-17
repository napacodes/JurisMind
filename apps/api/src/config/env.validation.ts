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
