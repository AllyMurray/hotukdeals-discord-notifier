import type { Route } from "./+types/index";

// POST /api/channels - Create a new channel
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // TODO: Implement channel creation
  return Response.json({ message: "Not implemented" }, { status: 501 });
}
