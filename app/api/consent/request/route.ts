import { NextRequest, NextResponse } from "next/server";
import { hashPolicy, makePseudonym } from "@/lib/consent/crypto";
import { newSalt, putSalt } from "@/lib/consent/saltStore";

type RequestBody = {
  controller: string;
  purpose_ids: string[];
  policy_text: string;
  // The subject's real identifier (here, their wallet identity key). A real
  // controller already knows who its customer is; it is sent so the controller
  // — not the chain, and not the client — derives and holds the pseudonym link.
  subject_id: string;
  scope_expiry?: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;

  if (
    !body.controller ||
    !Array.isArray(body.purpose_ids) ||
    !body.policy_text ||
    !body.subject_id
  ) {
    return NextResponse.json(
      { error: "controller, purpose_ids[], policy_text, subject_id required" },
      { status: 400 },
    );
  }

  // Per-consent random salt — the crypto-shredding secret. The controller
  // derives the pseudonym and keeps {pseudonym -> salt, subject_id} off-chain.
  // Only the pseudonym is destined for the chain; the salt never leaves here.
  const salt = newSalt();
  const subject_pseudonym = makePseudonym(
    body.subject_id,
    body.controller,
    salt,
  );

  await putSalt({
    salt,
    controller: body.controller,
    subject_id: body.subject_id,
    subject_pseudonym,
    issued_at: new Date().toISOString(),
    erased_at: null,
  });

  return NextResponse.json({
    controller: body.controller,
    purpose_ids: body.purpose_ids,
    policy_hash: hashPolicy(body.policy_text),
    policy_text: body.policy_text,
    subject_pseudonym,
    scope_expiry: body.scope_expiry ?? null,
  });
}
