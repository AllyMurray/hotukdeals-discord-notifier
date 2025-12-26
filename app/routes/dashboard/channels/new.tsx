import { useState } from "react";
import { useNavigate } from "react-router";
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

  const channel = await createChannel({ userId: user.id, name, webhookUrl });

  return { success: true, channelId: channel.channelId };
}

export default function NewChannel() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ChannelFormValues) => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("webhookUrl", values.webhookUrl);

    const response = await fetch("/dashboard/channels/new", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      notifications.show({
        title: "Channel created",
        message: "Your new channel has been created successfully.",
        color: "green",
      });
      navigate(`/dashboard/channels/${result.channelId}`);
    } else {
      notifications.show({
        title: "Error",
        message: result.error || "Failed to create channel. Please try again.",
        color: "red",
      });
      setIsSubmitting(false);
    }
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
