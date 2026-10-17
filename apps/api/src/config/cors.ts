import type { INestApplication } from "@nestjs/common";

/** Keep browser CORS limited to configured origins and the API's declared methods/headers. */
export function configureCors(app: INestApplication, trustedOrigins: readonly string[]): void {
  app.enableCors({
    origin: [...trustedOrigins],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Request-Id", "Idempotency-Key"],
    optionsSuccessStatus: 204,
  });
}
