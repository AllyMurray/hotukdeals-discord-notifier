import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/$id.edit";
import { ChannelEditPage } from "~/pages/dashboard";
import { type ChannelFormValues } from "~/components/channels";
import { getChannel, updateChannel } from "../../../../src/db/repository";

export async function loader({ params }: Route.LoaderArgs) {
  const channel = await getChannel({ id: params.id! });

  if (!channel) {
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
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const webhookUrl = formData.get("webhookUrl") as string;

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
