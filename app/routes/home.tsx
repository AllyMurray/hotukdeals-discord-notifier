import type { Route } from "./+types/home";
import { getUser } from "~/lib/auth";
import { HomePage } from "~/pages/HomePage";

export async function loader({ request }: Route.LoaderArgs) {
  const result = await getUser(request);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  return {
    isAuthenticated: !!result,
    error,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <HomePage
      isAuthenticated={loaderData.isAuthenticated}
      error={loaderData.error}
    />
  );
}
