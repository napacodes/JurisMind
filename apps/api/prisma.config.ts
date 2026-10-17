import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;
const prismaArguments = process.argv.slice(2);
const [command, subcommand, ...options] = prismaArguments;
const connectsToDatabase =
  (command === "migrate" &&
    (subcommand === "dev" ||
      subcommand === "deploy" ||
      subcommand === "status" ||
      (subcommand === "diff" &&
        (options.includes("--from-url") || options.includes("--to-url"))))) ||
  command === "db";

if (!databaseUrl && connectsToDatabase) {
  throw new Error(
    "DATABASE_URL is required for database commands. See apps/api/.env.example.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Prisma needs a datasource URL even for commands such as generate/validate.
  // This credential-free localhost target is for offline CLI commands such as
  // generate/validate. Database commands require an explicit DATABASE_URL above.
  datasource: {
    url: databaseUrl ?? "postgresql://localhost:5432/jurismind_dev?schema=public",
  },
});
