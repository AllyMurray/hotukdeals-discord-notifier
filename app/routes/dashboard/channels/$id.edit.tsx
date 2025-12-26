import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/$id.edit";
import { ChannelEditPage } from "~/pages/dashboard";
import { type ChannelFormValues } from "~/components/channels";
import { requireUser } from "~/lib/auth";
import { getChannel, updateChannel } from "../../../../src/db/repository";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const channel = await getChannel({ id: params.id! });

  if (!channel || channel.userId !== user.id) {
    throw new Response("Channel not found", { status: 404 });
  }

  return {
    channel: {
      id: channel.channelId,
      name: channel.name,
      webhookUrl: channel.webhookUrl,
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const webhookUrl = formData.get("webhookUrl") as string;

  // Verify ownership before updating
  const channel = await getChannel({ id: params.id! });
  if (!channel || channel.userId !== user.id) {
    return { success: false, error: "Channel not found or not authorized" };
  }

  await updateChannel({
    id: params.id!,
    name,
    webhookUrl,
  });

  return { success: true };
}

export default function EditChannel({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ChannelFormValues) => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("webhookUrl", values.webhookUrl);

    await fetch(`/dashboard/channels/${loaderData.channel.id}/edit`, {
      method: "POST",
      body: formData,
    });

    navigate(`/dashboard/channels/${loaderData.channel.id}`);
  };

  const handleCancel = () => {
    navigate(`/dashboard/channels/${loaderData.channel.id}`);
  };

  return (
    <ChannelEditPage
      channel={loaderData.channel}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
    />
  );
}
