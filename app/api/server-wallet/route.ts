import { createServerWalletHandler } from "@bsv/simple/server";

const handler = createServerWalletHandler();
export const GET = handler.GET;
export const POST = handler.POST;
