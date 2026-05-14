import { LockingScript } from "@bsv/sdk";
import {
  isConsent,
  isRevocation,
  type ConsentInscriptionV1,
  type ConsentRevocationV1,
} from "./schema";

export type ParsedInscription =
  | { kind: "consent"; data: ConsentInscriptionV1; raw: Record<string, unknown> }
  | { kind: "revocation"; data: ConsentRevocationV1; raw: Record<string, unknown> }
  | { kind: "other"; raw: Record<string, unknown> };

export function parseScriptForConsent(scriptHex: string): ParsedInscription | null {
  let script;
  try {
    script = LockingScript.fromHex(scriptHex);
  } catch {
    return null;
  }
  for (const chunk of script.chunks) {
    if (!chunk.data || chunk.data.length < 10) continue;
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(chunk.data));
    } catch {
      continue;
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith("{")) continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (typeof parsed.type !== "string" || !parsed.type.startsWith("gdpr-consent")) continue;
    if (isConsent(parsed)) return { kind: "consent", data: parsed, raw: parsed };
    if (isRevocation(parsed)) return { kind: "revocation", data: parsed, raw: parsed };
    return { kind: "other", raw: parsed };
  }
  return null;
}
