import { redirect } from "react-router";
import { authClient } from "./client.server";
import { getSession, createAuthSession } from "./session.server";
import { subjects } from "../../../functions/subjects";
import type { User } from "./schemas";

interface AuthResult {
  user: User;
  headers?: HeadersInit;
}

/**
 * Get the current user from session, returning null if not authenticated
 * Handles token refresh automatically
 */
export async function getUser(request: Request): Promise<AuthResult | null> {
  const session = await getSession(request);
  const accessToken = session.get("accessToken");
  const refreshToken = session.get("refreshToken");

  if (!accessToken || !refreshToken) {
    return null;
  }

  const verified = await authClient.verify(subjects, accessToken, {
    refresh: refreshToken,
  });

  if (verified.err) {
    return null;
  }

  // If tokens were refreshed, update the session
  let headers: HeadersInit | undefined;
  if (verified.tokens) {
    const newSessionCookie = await createAuthSession(
      verified.tokens.access,
      verified.tokens.refresh
    );
    headers = { "Set-Cookie": newSessionCookie };
  }

  return {
    user: verified.subject.properties as User,
    headers,
  };
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireUser(request: Request): Promise<AuthResult> {
  const result = await getUser(request);

  if (!result) {
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;
    throw redirect(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  return result;
}

/**
 * Require anonymous - redirect to dashboard if already authenticated
 */
export async function requireAnonymous(request: Request): Promise<void> {
  const result = await getUser(request);

  if (result) {
    throw redirect("/dashboard");
  }
}
