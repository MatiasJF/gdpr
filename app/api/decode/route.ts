import { NextRequest, NextResponse } from "next/server";
import { decodeTransaction } from "@/lib/consent/decode";
import { checkOutpointState, type Network } from "@/lib/consent/chain";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txid = searchParams.get("txid");
  const network = (searchParams.get("network") ?? "test") as Network;
  const voutParam = searchParams.get("vout");

  if (!txid || !/^[a-fA-F0-9]{64}$/.test(txid)) {
    return NextResponse.json(
      { error: "txid (64 hex chars) required" },
      { status: 400 },
    );
  }

  try {
    const decoded = await decodeTransaction(network, txid);
    const states = await Promise.all(
      decoded.inscriptions.map((i) =>
        checkOutpointState(network, `${txid}.${i.outputIndex}`),
      ),
    );

    return NextResponse.json({
      ...decoded,
      inscriptions: decoded.inscriptions.map((insc, idx) => ({
        ...insc,
        state: states[idx],
      })),
      filter: voutParam
        ? { vout: Number(voutParam) }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 404 },
    );
  }
}
