import type { Route } from "./+types/users";
import { requireAdmin } from "~/lib/auth/helpers.server";
import { getAllowedUsers, addAllowedUser, isUserAllowed } from "~/db/repository.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const users = await getAllowedUsers();

  return Response.json({ users }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireAdmin(request);

  if (request.method === "POST") {
    const body = await request.json();
    const { discordId } = body;

    if (!discordId || typeof discordId !== "string") {
      return Response.json(
        { error: "Discord ID is required" },
        { status: 400, headers }
      );
    }

    // Validate Discord ID format (17-19 digit number)
    if (!/^\d{17,19}$/.test(discordId)) {
      return Response.json(
        { error: "Invalid Discord ID format" },
        { status: 400, headers }
      );
    }

    // Check if user already exists
    const exists = await isUserAllowed({ discordId });
    if (exists) {
      return Response.json(
        { error: "User is already on the allowlist" },
        { status: 409, headers }
      );
    }

    const newUser = await addAllowedUser({
      discordId,
      addedBy: user.id,
      isAdmin: false,
    });

    return Response.json({ user: newUser }, { status: 201, headers });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers });
}
