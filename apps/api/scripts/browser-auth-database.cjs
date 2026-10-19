const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { Client } = require("pg");

const TEST_DATABASE = "jurismind_auth_test";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function parseLocalPostgresUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid PostgreSQL URL.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !LOCAL_HOSTS.has(hostname)) {
    throw new Error("A local PostgreSQL URL is required.");
  }
  return url;
}

function deriveTestUrl(sourceUrl) {
  const url = parseLocalPostgresUrl(sourceUrl);
  if (url.pathname !== "/jurismind_dev") {
    throw new Error("The configured source database must be jurismind_dev.");
  }
  url.pathname = `/${TEST_DATABASE}`;
  return url.toString();
}

async function verifyTestConnections() {
  const values = [process.env.DATABASE_URL, process.env.AUTH_TEST_DATABASE_URL];
  const urls = values.map((value) => {
    const url = parseLocalPostgresUrl(value || "");
    if (url.pathname !== `/${TEST_DATABASE}`) {
      throw new Error("Both connection URLs must target jurismind_auth_test.");
    }
    return url.toString();
  });

  const clients = urls.map((connectionString) => new Client({ connectionString }));
  try {
    const names = [];
    for (const client of clients) {
      await client.connect();
      const result = await client.query("SELECT current_database() AS name");
      names.push(result.rows[0]?.name);
    }
    if (names.length !== 2 || names.some((name) => name !== TEST_DATABASE)) {
      throw new Error("Database identity verification failed.");
    }
    process.stdout.write(names[0]);
  } finally {
    await Promise.all(clients.map((client) => client.end().catch(() => undefined)));
  }
}

function runSelfTest() {
  const validCases = [
    "postgresql://synthetic:synthetic@localhost:5432/jurismind_dev?schema=public",
    "postgres://synthetic:synthetic@127.0.0.1:5432/jurismind_dev",
    "postgresql://synthetic:synthetic@[::1]:5432/jurismind_dev",
  ];
  for (const value of validCases) {
    const derived = new URL(deriveTestUrl(value));
    assert.equal(derived.pathname, `/${TEST_DATABASE}`);
    assert.equal(LOCAL_HOSTS.has(derived.hostname.replace(/^\[|\]$/g, "")), true);
  }

  for (const value of [
    "mysql://synthetic:synthetic@localhost:5432/jurismind_dev",
    "postgresql://synthetic:synthetic@db.example.invalid:5432/jurismind_dev",
    "postgresql://synthetic:synthetic@localhost:5432/other_database",
    "not-a-url",
  ]) {
    assert.throws(() => deriveTestUrl(value));
  }
  process.stdout.write("Browser auth URL derivation checks passed.\n");
}

async function main() {
  switch (process.argv[2]) {
    case "derive":
      process.stdout.write(deriveTestUrl(process.env.DATABASE_URL || ""));
      break;
    case "verify":
      await verifyTestConnections();
      break;
    case "random-base64url":
      process.stdout.write(randomBytes(32).toString("base64url"));
      break;
    case "random-base64":
      process.stdout.write(randomBytes(32).toString("base64"));
      break;
    case "--self-test":
      runSelfTest();
      break;
    default:
      throw new Error("Specify derive, verify, random-base64url, random-base64, or --self-test.");
  }
}

main().catch(() => {
  process.stderr.write("Browser auth database helper failed; no connection details were displayed.\n");
  process.exitCode = 1;
});
