import type { Route } from "./+types/admin";
import { requireAdmin } from "~/lib/auth/helpers.server";
import { getAllowedUsers } from "~/db/repository.server";
import { AdminPage, type AllowedUserDisplay } from "~/pages/dashboard/AdminPage";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAdmin(request);
  const users = await getAllowedUsers();

  return {
    users: users.map((u): AllowedUserDisplay => ({
      discordId: u.discordId,
      username: u.username,
      avatar: u.avatar,
      isAdmin: u.isAdmin,
      addedBy: u.addedBy,
      addedAt: u.addedAt,
    })),
    currentUserId: user.id,
  };
}

export default function AdminRoute({ loaderData }: Route.ComponentProps) {
  return <AdminPage users={loaderData.users} currentUserId={loaderData.currentUserId} />;
}
