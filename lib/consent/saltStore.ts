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
// PoC note: persisted as a JSON file under the OS temp dir so it survives dev
// restarts. A production controller would use an access-controlled database
// with the salt held in a KMS/HSM and destroyed on an Art. 17 erasure request.

const STORE_PATH = path.join(tmpdir(), "gdpr-poc-salt-store.json");

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

type Store = Record<string, SaltRecord>;

async function load(): Promise<Store> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function save(store: Store): Promise<void> {
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

/** Fresh 32-byte random salt, hex-encoded. */
export function newSalt(): string {
  return randomBytes(32).toString("hex");
}

/** Record the salt + subject mapping for a freshly issued consent. */
export async function putSalt(record: SaltRecord): Promise<void> {
  const store = await load();
  store[record.subject_pseudonym] = record;
  await save(store);
}

/** The controller's own view of every consent it has salt for. */
export async function listSalts(): Promise<SaltRecord[]> {
  const store = await load();
  return Object.values(store).sort((a, b) =>
    a.issued_at < b.issued_at ? 1 : -1,
  );
}

export async function getByPseudonym(
  subject_pseudonym: string,
): Promise<SaltRecord | undefined> {
  const store = await load();
  return store[subject_pseudonym];
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
  const store = await load();
  const record = store[subject_pseudonym];
  if (!record) return { status: "not-found" };
  if (record.erased_at) return { status: "already-erased", record };

  record.salt = null;
  record.subject_id = null;
  record.erased_at = new Date().toISOString();
  await save(store);
  return { status: "erased", record };
}
