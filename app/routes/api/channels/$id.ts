import type { Route } from "./+types/$id";

// GET /api/channels/:id - Get a channel
// PUT /api/channels/:id - Update a channel
// DELETE /api/channels/:id - Delete a channel
export async function action({ request, params }: Route.ActionArgs) {
  const { id } = params;

  switch (request.method) {
    case "GET":
      // TODO: Implement get channel
      return Response.json({ message: "Not implemented", id }, { status: 501 });
    case "PUT":
      // TODO: Implement update channel
      return Response.json({ message: "Not implemented", id }, { status: 501 });
    case "DELETE":
      // TODO: Implement delete channel
      return Response.json({ message: "Not implemented", id }, { status: 501 });
    default:
      return new Response("Method not allowed", { status: 405 });
  }
}

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;
  // TODO: Implement get channel
  return Response.json({ message: "Not implemented", id }, { status: 501 });
}
