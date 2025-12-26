import type { Route } from "./+types/test-notification";

// POST /api/channels/:id/test-notification - Send a test notification
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { id } = params;
  // TODO: Implement test notification
  return Response.json({ message: "Not implemented", id }, { status: 501 });
}
