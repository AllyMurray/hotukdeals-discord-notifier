import { createClient } from "@openauthjs/openauth/client";
import { Resource } from "sst";

/**
 * OpenAuth client for server-side token operations
 * Uses SST Resource to get the auth URL
 */
export const authClient = createClient({
  clientID: "web",
  issuer: Resource.Auth.url,
});
