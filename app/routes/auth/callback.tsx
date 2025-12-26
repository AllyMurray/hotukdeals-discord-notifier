import type { Route } from "./+types/callback";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client.server";
import { createAuthSession } from "~/lib/auth/session.server";
import { subjects } from "functions/subjects";
import { isUserAllowed, getAllowedUser, addAllowedUser, updateAllowedUserAdmin, updateAllowedUserProfile } from "~/db/repository.server";
import { Resource } from "sst";

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

  // Verify the token to get user info
  const verified = await authClient.verify(subjects, access, {
    refresh: refresh,
  });

  if (verified.err) {
    console.error("Token verification failed:", verified.err);
    throw redirect("/?error=auth_failed");
  }

  const discordId = verified.subject.properties.id;

  // Check if this is the configured admin
  const adminDiscordId = Resource.AdminDiscordId.value;
  const isConfiguredAdmin = adminDiscordId && discordId === adminDiscordId;

  // Ensure the configured admin is always in the allowlist as an admin
  if (isConfiguredAdmin) {
    const existingUser = await getAllowedUser({ discordId });
    if (!existingUser) {
      // Add admin to allowlist
      await addAllowedUser({ discordId, addedBy: "system", isAdmin: true });
    } else if (!existingUser.isAdmin) {
      // Upgrade to admin if not already
      await updateAllowedUserAdmin({ discordId, isAdmin: true });
    }
  }

  // Check if user is in the allowlist
  const allowed = await isUserAllowed({ discordId });
  if (!allowed) {
    console.log(`User ${discordId} not in allowlist`);
    throw redirect("/?error=not_allowed");
  }

  // Update user profile info (username, avatar) on each login
  const { username, avatar } = verified.subject.properties;
  await updateAllowedUserProfile({ discordId, username, avatar });

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
