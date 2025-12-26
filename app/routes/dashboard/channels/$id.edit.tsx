import { useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { notifications } from "@mantine/notifications";
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

  try {
    await updateChannel({
      id: params.id!,
      name,
      webhookUrl,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update channel" };
  }
}

export default function EditChannel({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      notifications.show({
        title: "Channel updated",
        message: "Your channel has been updated successfully.",
        color: "green",
      });
      navigate(`/dashboard/channels/${loaderData.channel.id}`);
    } else if (fetcher.data && !fetcher.data.success) {
      notifications.show({
        title: "Error",
        message: fetcher.data.error || "Failed to update channel. Please try again.",
        color: "red",
      });
    }
  }, [fetcher.data, navigate, loaderData.channel.id]);

  const handleSubmit = (values: ChannelFormValues) => {
    fetcher.submit(
      { name: values.name, webhookUrl: values.webhookUrl },
      { method: "POST" }
    );
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
