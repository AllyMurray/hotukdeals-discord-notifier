import type { Route } from "./+types/logout";
import { redirect } from "react-router";
import { destroyAuthSession } from "~/lib/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const sessionCookie = await destroyAuthSession(request);

  throw redirect("/", {
    headers: {
      "Set-Cookie": sessionCookie,
    },
  });
}

// Also handle POST for logout buttons/forms
export async function action({ request }: Route.ActionArgs) {
  const sessionCookie = await destroyAuthSession(request);

  throw redirect("/", {
    headers: {
      "Set-Cookie": sessionCookie,
    },
  });
}

export default function Logout() {
  return null;
}
