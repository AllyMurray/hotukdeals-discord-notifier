import type { Route } from "./+types/index";

// POST /api/configs - Create a new config
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // TODO: Implement config creation
  return Response.json({ message: "Not implemented" }, { status: 501 });
}
