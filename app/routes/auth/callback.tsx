import type { Route } from "./+types/callback";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client.server";
import { createAuthSession } from "~/lib/auth/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";

  // Handle OAuth errors from Discord
  if (error) {
    const errorDescription = url.searchParams.get("error_description");
    console.error("OAuth error:", error, errorDescription);
    throw redirect("/?error=auth_failed");
  }

  if (!code) {
    throw redirect("/?error=auth_failed");
  }

  // Build the callback URL (must match what was sent in authorize)
  const callbackUrl = `${url.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  // Exchange code for tokens
  const exchanged = await authClient.exchange(code, callbackUrl);

  if (exchanged.err) {
    console.error("Token exchange failed:", exchanged.err);
    throw redirect("/?error=auth_failed");
  }

  const { access, refresh } = exchanged.tokens;

  // Create session with tokens
  const sessionCookie = await createAuthSession(access, refresh);

  // Redirect to intended destination with session cookie
  throw redirect(redirectTo, {
    headers: {
      "Set-Cookie": sessionCookie,
    },
  });
}

export default function Callback() {
  // This will never render since loader always redirects
  return null;
}
