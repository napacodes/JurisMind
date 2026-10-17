import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { validateEnvironment } from "./config/env.validation";
import { configureCors } from "./config/cors";

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "16kb", strict: true }));
  app.use(urlencoded({ extended: false, limit: "16kb" }));
  configureCors(app, environment.trustedOrigins);
  app.enableShutdownHooks();

  await app.listen(environment.port, "0.0.0.0");
}

void bootstrap();
