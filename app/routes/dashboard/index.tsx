import type { Route } from "./+types/index";
import { DashboardHomePage, type DashboardStats } from "~/pages/dashboard";
import { getAllChannels, getAllConfigs } from "../../../src/db/repository";

export async function loader({ request }: Route.LoaderArgs) {
  const [channels, configs] = await Promise.all([
    getAllChannels(),
    getAllConfigs(),
  ]);

  const stats: DashboardStats = {
    channelCount: channels.length,
    configCount: configs.length,
    enabledConfigCount: configs.filter((c) => c.enabled).length,
  };

  return { stats };
}

export default function DashboardIndex({ loaderData }: Route.ComponentProps) {
  return <DashboardHomePage stats={loaderData.stats} />;
}
