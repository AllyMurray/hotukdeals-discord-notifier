import type { Route } from "./+types/$channelId.$searchTerm";

// PUT /api/configs/:channelId/:searchTerm - Update a config
// DELETE /api/configs/:channelId/:searchTerm - Delete a config
export async function action({ request, params }: Route.ActionArgs) {
  const { channelId, searchTerm } = params;

  switch (request.method) {
    case "PUT":
      // TODO: Implement update config
      return Response.json(
        { message: "Not implemented", channelId, searchTerm },
        { status: 501 }
      );
    case "DELETE":
      // TODO: Implement delete config
      return Response.json(
        { message: "Not implemented", channelId, searchTerm },
        { status: 501 }
      );
    default:
      return new Response("Method not allowed", { status: 405 });
  }
}
