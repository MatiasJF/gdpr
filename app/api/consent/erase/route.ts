import { NextRequest, NextResponse } from "next/server";
import { eraseSalt, listSalts, type SaltRecord } from "@/lib/consent/saltStore";

// Controller-side Art. 17 erasure by crypto-shredding. Destroying the off-chain
// salt makes the on-chain pseudonym non-re-identifiable by the controller or any
// third party, without (and indeed unable to) touch the immutable on-chain
// commitment. This is the operational core of the anonymisation-on-erasure
// argument in the paper.

// A safe, controller-facing projection: never leak the salt or the raw subject
// id over the wire. We surface only whether the link still exists and a short
// preview of the subject id while it does.
function project(r: SaltRecord) {
  const linkable = r.salt !== null && r.subject_id !== null;
  return {
    subject_pseudonym: r.subject_pseudonym,
    controller: r.controller,
    issued_at: r.issued_at,
    erased_at: r.erased_at,
    re_identifiable: linkable,
    subject_id_preview: linkable
      ? `${r.subject_id!.slice(0, 10)}…`
      : null,
  };
}

// GET: the controller's own view of every consent it still holds salt for.
export async function GET() {
  const records = await listSalts();
  return NextResponse.json({ records: records.map(project) });
}

// POST { subject_pseudonym }: crypto-shred that consent.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { subject_pseudonym?: string };
  if (!body.subject_pseudonym) {
    return NextResponse.json(
      { error: "subject_pseudonym required" },
      { status: 400 },
    );
  }

  const result = await eraseSalt(body.subject_pseudonym);

  if (result.status === "not-found") {
    return NextResponse.json(
      { error: "no salt held for that pseudonym" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    status: result.status,
    subject_pseudonym: body.subject_pseudonym,
    // Before: the controller could recompute sha256(subject_id|controller|salt)
    // and link the chain record to a person. After: salt destroyed, so it
    // cannot — the on-chain commitment is now anonymous.
    before: { re_identifiable: true },
    after: { re_identifiable: false },
    record: project(result.record),
  });
}
