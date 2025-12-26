import { useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { notifications } from "@mantine/notifications";
import type { Route } from "./+types/new";
import { ChannelNewPage } from "~/pages/dashboard";
import { type ChannelFormValues } from "~/components/channels";
import { requireUser } from "~/lib/auth";
import { createChannel } from "../../../../src/db/repository";

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const webhookUrl = formData.get("webhookUrl") as string;

  try {
    const channel = await createChannel({ userId: user.id, name, webhookUrl });
    return { success: true, channelId: channel.channelId };
  } catch {
    return { success: false, error: "Failed to create channel" };
  }
}

export default function NewChannel() {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.channelId) {
      notifications.show({
        title: "Channel created",
        message: "Your new channel has been created successfully.",
        color: "green",
      });
      navigate(`/dashboard/channels/${fetcher.data.channelId}`);
    } else if (fetcher.data && !fetcher.data.success) {
      notifications.show({
        title: "Error",
        message: fetcher.data.error || "Failed to create channel. Please try again.",
        color: "red",
      });
    }
  }, [fetcher.data, navigate]);

  const handleSubmit = (values: ChannelFormValues) => {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("webhookUrl", values.webhookUrl);

    fetcher.submit(formData, {
      method: "POST",
      action: "/dashboard/channels/new",
    });
  };

  const handleCancel = () => {
    navigate("/dashboard/channels");
  };

  return (
    <ChannelNewPage
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
    />
  );
}
