import { Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/_dashboard";
import { DashboardLayout } from "~/components/layout";
import { requireUser, type User } from "~/lib/auth";

interface LoaderData {
  user: User;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);

  return Response.json({ user }, { headers });
}

export default function DashboardLayoutRoute() {
  const { user } = useLoaderData<LoaderData>();

  return (
    <DashboardLayout user={user}>
      <Outlet context={{ user }} />
    </DashboardLayout>
  );
}
