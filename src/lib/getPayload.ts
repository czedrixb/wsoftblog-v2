import { getPayload as getPayloadInstance } from "payload";
import config from "@payload-config";

/**
 * Cached Local API accessor. Public pages read through this — no HTTP hop,
 * no `/api/blog` endpoint to keep alive (WOS-313 core feature #4).
 */
export const getPayload = () => getPayloadInstance({ config });
