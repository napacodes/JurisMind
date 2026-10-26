import { chmod, lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { createHash, createHmac } from "node:crypto";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";
import { MAX_CREDENTIAL_DOCUMENT_BYTES } from "./credential-document";

const STORAGE_KEY = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/)?[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.private$/i;
const MAX_DOCUMENT_BYTES = MAX_CREDENTIAL_DOCUMENT_BYTES;

@Injectable()
export class PrivateDocumentStorage {
  private readonly root = resolve(process.cwd(), ".private-document-storage");

  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  async put(storageKey: string, bytes: Buffer): Promise<void> {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES) {
      throw new ServiceUnavailableException("Document storage is unavailable.");
    }
    if (!STORAGE_KEY.test(storageKey)) throw new ServiceUnavailableException("Document storage is unavailable.");
    if (this.environment.privateDocumentStorage?.driver === "s3") {
      await this.s3Request("PUT", storageKey, bytes);
      return;
    }
    this.assertLocalStorageAvailable();
    const path = this.localPath(storageKey);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await this.assertPrivateDirectory(this.root);
    if (dirname(path) !== this.root) await this.assertPrivateDirectory(dirname(path));
    if (process.platform !== "win32") await chmod(dirname(path), 0o700);
    await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  }

  async read(storageKey: string): Promise<Buffer> {
    if (!STORAGE_KEY.test(storageKey)) throw new ServiceUnavailableException("Document storage is unavailable.");
    if (this.environment.privateDocumentStorage?.driver === "s3") {
      const response = await this.s3Request("GET", storageKey);
      if (response.status !== 200 || !response.body) throw new ServiceUnavailableException("Document storage is unavailable.");
      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_DOCUMENT_BYTES) {
        await response.body.cancel();
        throw new ServiceUnavailableException("Document storage is unavailable.");
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          totalBytes += part.value.byteLength;
          if (totalBytes > MAX_DOCUMENT_BYTES) {
            await reader.cancel();
            throw new ServiceUnavailableException("Document storage is unavailable.");
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      if (totalBytes === 0) throw new ServiceUnavailableException("Document storage is unavailable.");
      return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
    }
    this.assertLocalStorageAvailable();
    const path = this.localPath(storageKey);
    await this.assertPrivateDirectory(this.root);
    if (dirname(path) !== this.root) await this.assertPrivateDirectory(dirname(path));
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_DOCUMENT_BYTES) {
      throw new ServiceUnavailableException("Document storage is unavailable.");
    }
    return readFile(path);
  }

  async remove(storageKey: string): Promise<void> {
    if (!STORAGE_KEY.test(storageKey)) return;
    if (this.environment.privateDocumentStorage?.driver === "s3") {
      await this.s3Request("DELETE", storageKey).catch(() => undefined);
      return;
    }
    if (this.environment.nodeEnv === "production") return;
    try {
      const path = this.localPath(storageKey);
      await this.assertPrivateDirectory(this.root);
      if (dirname(path) !== this.root) await this.assertPrivateDirectory(dirname(path));
      await unlink(path).catch(() => undefined);
    } catch { /* Best-effort cleanup never masks the transaction error. */ }
  }

  private assertLocalStorageAvailable(): void {
    if (this.environment.nodeEnv === "production") throw new ServiceUnavailableException("Private document storage is not configured.");
  }

  private async assertPrivateDirectory(path: string): Promise<void> {
    const directory = await lstat(path);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new ServiceUnavailableException("Document storage is unavailable.");
    if (process.platform !== "win32") await chmod(path, 0o700);
  }

  private localPath(storageKey: string): string {
    const path = resolve(this.root, storageKey);
    const relativePath = relative(this.root, path);
    if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new ServiceUnavailableException("Document storage is unavailable.");
    }
    return path;
  }

  private async s3Request(method: "PUT" | "GET" | "DELETE", storageKey: string, body?: Buffer): Promise<Response> {
    const config = this.environment.privateDocumentStorage;
    if (!config || config.driver !== "s3") throw new ServiceUnavailableException("Private document storage is not configured.");
    const endpoint = new URL(config.endpoint ?? `https://s3.${config.region}.amazonaws.com`);
    const encodedKey = storageKey.split("/").map(awsEncode).join("/");
    const url = new URL(`/${awsEncode(config.bucket)}/${encodedKey}`, endpoint);
    const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.slice(0, 8);
    const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timestamp}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const scope = `${date}/${config.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", timestamp, scope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const dateKey = hmac(Buffer.from(`AWS4${config.secretAccessKey}`, "utf8"), date);
    const regionKey = hmac(dateKey, config.region);
    const serviceKey = hmac(regionKey, "s3");
    const signingKey = hmac(serviceKey, "aws4_request");
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          authorization,
          "x-amz-content-sha256": payloadHash,
          "x-amz-date": timestamp,
          ...(body ? { "content-type": "application/octet-stream" } : {}),
        },
        ...(body ? { body: body as BodyInit } : {}),
        redirect: "error",
      });
    } catch {
      throw new ServiceUnavailableException("Private document storage is unavailable.");
    }
    if ((method === "PUT" && ![200, 201, 204].includes(response.status))
      || (method === "GET" && response.status !== 200)
      || (method === "DELETE" && ![200, 204, 404].includes(response.status))) {
      await response.body?.cancel().catch(() => undefined);
      throw new ServiceUnavailableException("Private document storage is unavailable.");
    }
    return response;
  }
}

function hmac(key: Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}
