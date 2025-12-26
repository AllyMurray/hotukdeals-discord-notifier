import type { Route } from "./+types/users.$discordId";
import { requireAdmin } from "~/lib/auth/helpers.server";
import { removeAllowedUser, getAllowedUser, getAllowedUsers } from "~/db/repository.server";

export async function action({ request, params }: Route.ActionArgs) {
  const { user, headers } = await requireAdmin(request);
  const { discordId } = params;

  if (!discordId) {
    return Response.json(
      { error: "Discord ID is required" },
      { status: 400, headers }
    );
  }

  if (request.method === "DELETE") {
    // Cannot delete yourself
    if (discordId === user.id) {
      return Response.json(
        { error: "You cannot remove yourself from the allowlist" },
        { status: 400, headers }
      );
    }

    // Check if user exists
    const targetUser = await getAllowedUser({ discordId });
    if (!targetUser) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers }
      );
    }

    // Cannot delete the only admin
    if (targetUser.isAdmin) {
      const users = await getAllowedUsers();
      const adminCount = users.filter((u) => u.isAdmin).length;
      if (adminCount === 1) {
        return Response.json(
          { error: "Cannot remove the only admin" },
          { status: 400, headers }
        );
      }
    }

    await removeAllowedUser({ discordId });

    return Response.json({ success: true }, { headers });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers });
}
