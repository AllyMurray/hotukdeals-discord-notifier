import { useState } from "react";
import { useNavigate, useRevalidator } from "react-router";
import type { Route } from "./+types/$id";
import { ChannelDetailPage } from "~/pages/dashboard";
import {
  ConfigFormModal,
  DeleteConfigModal,
  type ConfigFormValues,
} from "~/components/configs";
import { notifications } from "@mantine/notifications";
import {
  getChannel,
  getConfigsByChannel,
  upsertConfig,
  deleteConfig,
} from "../../../../src/db/repository";

export async function loader({ params }: Route.LoaderArgs) {
  const channel = await getChannel({ id: params.id! });

  if (!channel) {
    throw new Response("Channel not found", { status: 404 });
  }

  const configs = await getConfigsByChannel({ channelId: params.id! });

  return {
    channel: {
      id: channel.channelId,
      name: channel.name,
      webhookUrl: channel.webhookUrl,
    },
    configs: configs.map((c) => ({
      searchTerm: c.searchTerm,
      enabled: c.enabled,
      includeKeywords: c.includeKeywords || [],
      excludeKeywords: c.excludeKeywords || [],
    })),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upsertConfig") {
    const searchTerm = formData.get("searchTerm") as string;
    const enabled = formData.get("enabled") === "true";
    const includeKeywords = JSON.parse(
      (formData.get("includeKeywords") as string) || "[]"
    );
    const excludeKeywords = JSON.parse(
      (formData.get("excludeKeywords") as string) || "[]"
    );
    const caseSensitive = formData.get("caseSensitive") === "true";

    await upsertConfig({
      channelId: params.id!,
      searchTerm,
      enabled,
      includeKeywords,
      excludeKeywords,
      caseSensitive,
    });

    return { success: true };
  }

  if (intent === "deleteConfig") {
    const searchTerm = formData.get("searchTerm") as string;
    await deleteConfig({ channelId: params.id!, searchTerm });
    return { success: true };
  }

  if (intent === "toggleConfig") {
    const searchTerm = formData.get("searchTerm") as string;
    const enabled = formData.get("enabled") === "true";

    await upsertConfig({
      channelId: params.id!,
      searchTerm,
      enabled,
    });

    return { success: true };
  }

  if (intent === "testNotification") {
    const channel = await getChannel({ id: params.id! });
    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    try {
      const response = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "Test Notification",
              description:
                "This is a test notification from HotUKDeals Notifier. If you see this, your webhook is working correctly!",
              color: 0xff8510,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!response.ok) {
        return { success: false, error: "Webhook returned error" };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to send notification" };
    }
  }

  return { success: false };
}

export default function ChannelDetail({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [configModal, setConfigModal] = useState<{
    open: boolean;
    config: ConfigFormValues | null;
    isEditing: boolean;
  }>({ open: false, config: null, isEditing: false });

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    searchTerm: string | null;
  }>({ open: false, searchTerm: null });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleAddConfig = () => {
    setConfigModal({ open: true, config: null, isEditing: false });
  };

  const handleEditConfig = (searchTerm: string) => {
    const config = loaderData.configs.find((c) => c.searchTerm === searchTerm);
    if (config) {
      setConfigModal({
        open: true,
        config: { ...config, caseSensitive: false },
        isEditing: true,
      });
    }
  };

  const handleDeleteConfig = (searchTerm: string) => {
    setDeleteModal({ open: true, searchTerm });
  };

  const handleToggleConfig = async (searchTerm: string, enabled: boolean) => {
    const formData = new FormData();
    formData.set("intent", "toggleConfig");
    formData.set("searchTerm", searchTerm);
    formData.set("enabled", String(enabled));

    await fetch(`/dashboard/channels/${loaderData.channel.id}`, {
      method: "POST",
      body: formData,
    });

    revalidator.revalidate();
  };

  const handleSubmitConfig = async (values: ConfigFormValues) => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("intent", "upsertConfig");
    formData.set("searchTerm", values.searchTerm);
    formData.set("enabled", String(values.enabled));
    formData.set("includeKeywords", JSON.stringify(values.includeKeywords));
    formData.set("excludeKeywords", JSON.stringify(values.excludeKeywords));
    formData.set("caseSensitive", String(values.caseSensitive));

    await fetch(`/dashboard/channels/${loaderData.channel.id}`, {
      method: "POST",
      body: formData,
    });

    setIsSubmitting(false);
    setConfigModal({ open: false, config: null, isEditing: false });
    revalidator.revalidate();
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.searchTerm) return;

    setIsDeleting(true);

    const formData = new FormData();
    formData.set("intent", "deleteConfig");
    formData.set("searchTerm", deleteModal.searchTerm);

    await fetch(`/dashboard/channels/${loaderData.channel.id}`, {
      method: "POST",
      body: formData,
    });

    setIsDeleting(false);
    setDeleteModal({ open: false, searchTerm: null });
    revalidator.revalidate();
  };

  const handleTestNotification = async () => {
    setIsTesting(true);

    const formData = new FormData();
    formData.set("intent", "testNotification");

    const response = await fetch(
      `/dashboard/channels/${loaderData.channel.id}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    setIsTesting(false);

    if (result.success) {
      notifications.show({
        title: "Success",
        message: "Test notification sent successfully!",
        color: "green",
      });
    } else {
      notifications.show({
        title: "Error",
        message: result.error || "Failed to send test notification",
        color: "red",
      });
    }
  };

  return (
    <>
      <ChannelDetailPage
        channel={loaderData.channel}
        configs={loaderData.configs}
        onAddConfig={handleAddConfig}
        onEditConfig={handleEditConfig}
        onDeleteConfig={handleDeleteConfig}
        onToggleConfig={handleToggleConfig}
        onTestNotification={handleTestNotification}
        isTestingNotification={isTesting}
      />

      <ConfigFormModal
        opened={configModal.open}
        onClose={() =>
          setConfigModal({ open: false, config: null, isEditing: false })
        }
        onSubmit={handleSubmitConfig}
        initialValues={configModal.config || undefined}
        isSubmitting={isSubmitting}
        isEditing={configModal.isEditing}
      />

      {deleteModal.searchTerm && (
        <DeleteConfigModal
          opened={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, searchTerm: null })}
          onConfirm={handleConfirmDelete}
          searchTerm={deleteModal.searchTerm}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
