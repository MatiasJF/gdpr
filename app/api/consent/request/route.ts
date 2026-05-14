import { NextRequest, NextResponse } from "next/server";
import { hashPolicy } from "@/lib/consent/crypto";

type RequestBody = {
  controller: string;
  purpose_ids: string[];
  policy_text: string;
  scope_expiry?: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;

  if (!body.controller || !Array.isArray(body.purpose_ids) || !body.policy_text) {
    return NextResponse.json(
      { error: "controller, purpose_ids[], policy_text required" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    controller: body.controller,
    purpose_ids: body.purpose_ids,
    policy_hash: hashPolicy(body.policy_text),
    policy_text: body.policy_text,
    scope_expiry: body.scope_expiry ?? null,
  });
}
