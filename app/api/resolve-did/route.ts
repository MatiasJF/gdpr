import { createDIDResolverHandler } from "@bsv/simple/server";

const handler = createDIDResolverHandler();
export const GET = handler.GET;
