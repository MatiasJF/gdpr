import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Controller-side, OFF-CHAIN salt store. This stands in for the secure
// internal database a real data controller would operate. It is the technical
// substrate of the crypto-shredding argument: the per-consent salt is the only
// secret that binds the on-chain pseudonym back to a real subject identifier.
// Destroying it (eraseSalt) renders the on-chain commitment non-re-identifiable
// by the controller or any third party — i.e. anonymisation-on-erasure — while
// the immutable on-chain token is left untouched.
//
// Persistence: on Netlify the store is Netlify Blobs (persists across the
// serverless invocations the deployed demo runs as). Locally — or anywhere the
// Blobs environment is unavailable — it falls back to a JSON file under the OS
// temp dir. A production controller would use an access-controlled database with
// the salt held in a KMS/HSM and destroyed on an Art. 17 erasure request.

export type SaltRecord = {
  // The salt: high-entropy secret. Set to null once crypto-shredded.
  salt: string | null;
  controller: string;
  // The real subject identifier the pseudonym maps back to (controller-held).
  // Cleared alongside the salt on erasure so no plaintext link survives.
  subject_id: string | null;
  subject_pseudonym: string;
  issued_at: string;
  erased_at: string | null;
};

// --- Backend abstraction: key (= pseudonym) -> SaltRecord ------------------

type Backend = {
  get(key: string): Promise<SaltRecord | undefined>;
  set(key: string, record: SaltRecord): Promise<void>;
  list(): Promise<SaltRecord[]>;
};

const STORE_NAME = "gdpr-salt-store";

function blobsBackend(store: {
  get(key: string, opts: { type: "json" }): Promise<SaltRecord | null>;
  setJSON(key: string, value: SaltRecord): Promise<unknown>;
  list(): Promise<{ blobs: Array<{ key: string }> }>;
}): Backend {
  return {
    async get(key) {
      return (await store.get(key, { type: "json" })) ?? undefined;
    },
    async set(key, record) {
      await store.setJSON(key, record);
    },
    async list() {
      const { blobs } = await store.list();
      const records = await Promise.all(
        blobs.map((b) => store.get(b.key, { type: "json" })),
      );
      return records.filter((r): r is SaltRecord => r !== null);
    },
  };
}

function fileBackend(): Backend {
  const STORE_PATH = path.join(tmpdir(), "gdpr-poc-salt-store.json");
  type Map = Record<string, SaltRecord>;
  const load = async (): Promise<Map> => {
    try {
      return JSON.parse(await readFile(STORE_PATH, "utf8")) as Map;
    } catch {
      return {};
    }
  };
  const save = (m: Map) => writeFile(STORE_PATH, JSON.stringify(m, null, 2), "utf8");
  return {
    async get(key) {
      return (await load())[key];
    },
    async set(key, record) {
      const m = await load();
      m[key] = record;
      await save(m);
    },
    async list() {
      return Object.values(await load());
    },
  };
}

let backendPromise: Promise<Backend> | null = null;

async function initBackend(): Promise<Backend> {
  try {
    const { getStore } = await import("@netlify/blobs");
    // `consistency: "strong"` gives read-after-write, so an erasure is visible
    // immediately on the next read (the demo flips linkable -> anonymous live).
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    // Probe: throws (MissingBlobsEnvironment) when not running on Netlify.
    await store.list();
    return blobsBackend(store as never);
  } catch {
    return fileBackend();
  }
}

function backend(): Promise<Backend> {
  if (!backendPromise) backendPromise = initBackend();
  return backendPromise;
}

// --- Public API ------------------------------------------------------------

/** Fresh 32-byte random salt, hex-encoded. */
export function newSalt(): string {
  return randomBytes(32).toString("hex");
}

/** Record the salt + subject mapping for a freshly issued consent. */
export async function putSalt(record: SaltRecord): Promise<void> {
  await (await backend()).set(record.subject_pseudonym, record);
}

/** The controller's own view of every consent it has salt for. */
export async function listSalts(): Promise<SaltRecord[]> {
  const records = await (await backend()).list();
  return records.sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1));
}

export async function getByPseudonym(
  subject_pseudonym: string,
): Promise<SaltRecord | undefined> {
  return (await backend()).get(subject_pseudonym);
}

export type EraseResult =
  | { status: "erased"; record: SaltRecord }
  | { status: "already-erased"; record: SaltRecord }
  | { status: "not-found" };

/**
 * Crypto-shred: destroy the salt (and the plaintext subject link) for a
 * pseudonym. The on-chain commitment is intentionally NOT touched — it cannot
 * be, and need not be: once the salt is gone the controller can no longer
 * recompute or verify the binding sha256(subject_id | controller | salt), so
 * the on-chain pseudonym is anonymous from the controller's and any third
 * party's standpoint.
 */
export async function eraseSalt(
  subject_pseudonym: string,
): Promise<EraseResult> {
  const store = await backend();
  const record = await store.get(subject_pseudonym);
  if (!record) return { status: "not-found" };
  if (record.erased_at) return { status: "already-erased", record };

  record.salt = null;
  record.subject_id = null;
  record.erased_at = new Date().toISOString();
  await store.set(subject_pseudonym, record);
  return { status: "erased", record };
}
