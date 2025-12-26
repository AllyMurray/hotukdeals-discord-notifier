import { redirect, useNavigate } from "react-router";
import type { Route } from "./+types/new";
import { ChannelNewPage } from "~/pages/dashboard";
import { requireUser } from "~/lib/auth";
import { createChannel } from "../../../../src/db/repository";

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const webhookUrl = formData.get("webhookUrl") as string;

  const channel = await createChannel({ userId: user.id, name, webhookUrl });
  return redirect(`/dashboard/channels/${channel.channelId}`);
}

export default function NewChannel() {
  const navigate = useNavigate();

  return <ChannelNewPage onCancel={() => navigate("/dashboard/channels")} />;
}
