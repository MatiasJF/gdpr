import { NextRequest, NextResponse } from "next/server";
import { checkOutpointState, type Network } from "@/lib/consent/chain";

type AuditRequest = {
  network?: Network;
  outpoints: string[];
};

// v0 audit: presence + spent-state check via WhatsOnChain. The caller (a data
// controller) must independently parse inscription bytes from each tx to confirm
// the claimed consent metadata is the metadata on-chain. Inscription-script
// parsing is tracked as future work — see README and the paper limitations.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as AuditRequest;
  const network: Network = body.network ?? "test";

  if (!Array.isArray(body.outpoints) || body.outpoints.length === 0) {
    return NextResponse.json(
      { error: "outpoints[] required" },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    body.outpoints.map((op) => checkOutpointState(network, op)),
  );

  return NextResponse.json({
    network,
    checked_at: new Date().toISOString(),
    live: results.filter((r) => r.exists && !r.spent),
    revoked: results.filter((r) => r.exists && r.spent),
    missing: results.filter((r) => !r.exists),
  });
}
