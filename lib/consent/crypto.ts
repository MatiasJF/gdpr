import { createHash } from "node:crypto";

export function makePseudonym(
  subjectId: string,
  controllerId: string,
  salt: string,
): string {
  return createHash("sha256")
    .update(`${subjectId}|${controllerId}|${salt}`)
    .digest("hex");
}

export function hashPolicy(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}
