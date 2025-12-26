import type { Route } from "./+types/login";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client.server";
import { requireAnonymous } from "~/lib/auth";

export async function loader({ request }: Route.LoaderArgs) {
  // Redirect if already logged in
  await requireAnonymous(request);

  // Get the redirect URL after login (default to dashboard)
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";

  // Generate the OAuth authorization URL
  const callbackUrl = `${url.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
  const { url: authUrl } = await authClient.authorize(callbackUrl, "code");

  // Redirect to OpenAuth server (Discord)
  throw redirect(authUrl);
}

export default function Login() {
  // This will never render since loader always redirects
  return null;
}
