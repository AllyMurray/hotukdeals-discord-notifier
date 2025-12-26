import { createCookieSessionStorage } from "react-router";
import { Resource } from "sst";

interface SessionData {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cookie session storage for auth tokens
 */
export const authSessionStorage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    secrets: [Resource.SessionSecret.value],
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

/**
 * Get the session from request cookies
 */
export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return authSessionStorage.getSession(cookie);
}

/**
 * Create session with tokens and return Set-Cookie header
 */
export async function createAuthSession(
  accessToken: string,
  refreshToken: string
) {
  const session = await authSessionStorage.getSession();
  session.set("accessToken", accessToken);
  session.set("refreshToken", refreshToken);
  return authSessionStorage.commitSession(session);
}

/**
 * Destroy session and return Set-Cookie header to clear cookie
 */
export async function destroyAuthSession(request: Request) {
  const session = await getSession(request);
  return authSessionStorage.destroySession(session);
}
