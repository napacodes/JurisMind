
import "dotenv/config";

import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PasswordHasherService } from "../src/auth/password-hasher.service";
import { validateEnvironment } from "../src/config/env.validation";

function readVisible(prompt: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function readSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run this script directly in an interactive terminal.");
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let secret = "";

    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      process.stdout.write("\n");
    };

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(secret);
          return;
        }

        if (char === "\u007f" || char === "\b") {
          secret = secret.slice(0, -1);
          continue;
        }

        if (char >= " " && char !== "\u007f") {
          secret += char;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Refusing to run outside NODE_ENV=development.");
  }

  const environment = validateEnvironment(process.env);
  const databaseUrl = new URL(environment.databaseUrl);
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));

  if (
    databaseName !== "jurismind_dev" ||
    !["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname)
  ) {
    throw new Error(
      "Refusing to run: the target must be local jurismind_dev.",
    );
  }

  const emailInput = await readVisible("Admin email: ");
  const emailNormalized = emailInput.toLowerCase();

  if (
    emailNormalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)
  ) {
    throw new Error("Enter a valid email address.");
  }

  const fullName = await readVisible("Admin full name: ");
  if (!fullName || fullName.length > 200) {
    throw new Error("Full name must contain 1–200 characters.");
  }

  const password = await readSecret("Admin password (input hidden): ");
  const confirmation = await readSecret("Confirm password (input hidden): ");

  if (password !== confirmation) {
    throw new Error("Passwords do not match.");
  }

  const hasher = new PasswordHasherService();
  const passwordHash = await hasher.hash(
    password,
    environment.passwordMinLength,
  );

  // Remove references to the plaintext password before database operations.
  // JavaScript strings are immutable; this does not guarantee memory erasure.
  const adapter = new PrismaPg({
    connectionString: environment.databaseUrl,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.platformRoleGrant.findFirst({
        where: {
          role: "SUPER_ADMIN",
          revokedAt: null,
        },
        select: { id: true },
      });

      if (existingAdmin) {
        throw new Error(
          "An active Super Admin already exists. No changes made.",
        );
      }

      const existingUser = await tx.user.findUnique({
        where: { emailNormalized },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error(
          "That email already belongs to a user. No changes made.",
        );
      }

      const user = await tx.user.create({
        data: {
          email: emailNormalized,
          emailNormalized,
          fullName,
          passwordHash,
          status: "ACTIVE",
        },
        select: { id: true, email: true },
      });

      await tx.platformRoleGrant.create({
        data: {
          userId: user.id,
          role: "SUPER_ADMIN",
        },
      });

      console.log(`Created initial Super Admin: ${user.email}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Super Admin bootstrap failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
