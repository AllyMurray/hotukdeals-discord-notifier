import { Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/_dashboard";
import { DashboardLayout } from "~/components/layout";
import { requireUser, type User } from "~/lib/auth";
import { isUserAdmin } from "~/db/repository.server";

interface LoaderData {
  user: User;
  isAdmin: boolean;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const isAdmin = await isUserAdmin({ discordId: user.id });

  return Response.json({ user, isAdmin }, { headers });
}

export default function DashboardLayoutRoute() {
  const { user, isAdmin } = useLoaderData<LoaderData>();

  return (
    <DashboardLayout user={user} isAdmin={isAdmin}>
      <Outlet context={{ user, isAdmin }} />
    </DashboardLayout>
  );
}
