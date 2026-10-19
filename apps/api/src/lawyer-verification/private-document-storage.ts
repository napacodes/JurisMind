import { chmod, lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AUTH_ENVIRONMENT, AuthEnvironment } from "../auth/auth.types";

const STORAGE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.private$/i;

@Injectable()
export class PrivateDocumentStorage {
  private readonly root = resolve(process.cwd(), ".private-document-storage");

  constructor(@Inject(AUTH_ENVIRONMENT) private readonly environment: AuthEnvironment) {}

  async put(storageKey: string, bytes: Buffer): Promise<void> {
    this.assertLocalStorageAvailable(storageKey);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const directory = await lstat(this.root);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new ServiceUnavailableException("Document storage is unavailable.");
    if (process.platform !== "win32") await chmod(this.root, 0o700);
    await writeFile(join(this.root, storageKey), bytes, { flag: "wx", mode: 0o600 });
  }

  async read(storageKey: string): Promise<Buffer> {
    this.assertLocalStorageAvailable(storageKey);
    const path = join(this.root, storageKey);
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new ServiceUnavailableException("Document storage is unavailable.");
    return readFile(path);
  }

  async remove(storageKey: string): Promise<void> {
    if (!STORAGE_KEY.test(storageKey)) return;
    await unlink(join(this.root, storageKey)).catch(() => undefined);
  }

  private assertLocalStorageAvailable(storageKey: string): void {
    if (this.environment.nodeEnv === "production") throw new ServiceUnavailableException("Private document storage is not configured.");
    if (!STORAGE_KEY.test(storageKey)) throw new ServiceUnavailableException("Document storage is unavailable.");
  }
}
