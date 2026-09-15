import { getPayload as getPayloadInstance } from "payload";
import config from "@payload-config";

/**
 * Local API accessor (Payload memoizes the instance internally). Public pages
 * read through this — no HTTP hop, no `/api/blog` endpoint to keep alive
 * (WOS-313 core feature #4).
 */
export const getPayload = () => getPayloadInstance({ config });
