import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/index";
import { ChannelsListPage, type ChannelWithStats } from "~/pages/dashboard";
import { DeleteChannelModal } from "~/components/channels";
import {
  getAllChannels,
  getConfigsByChannel,
  deleteChannel,
} from "../../../../src/db/repository";

export async function loader({ request }: Route.LoaderArgs) {
  const channels = await getAllChannels();

  // Get config counts for each channel
  const channelsWithStats: ChannelWithStats[] = await Promise.all(
    channels.map(async (channel) => {
      const configs = await getConfigsByChannel({ channelId: channel.channelId });
      return {
        id: channel.channelId,
        name: channel.name,
        webhookUrl: channel.webhookUrl,
        configCount: configs.length,
        enabledConfigCount: configs.filter((c) => c.enabled).length,
      };
    })
  );

  return { channels: channelsWithStats };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const channelId = formData.get("channelId") as string;
    await deleteChannel({ id: channelId });
    return { success: true };
  }

  return { success: false };
}

export default function ChannelsIndex({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    channel: ChannelWithStats | null;
  }>({ open: false, channel: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (id: string) => {
    navigate(`/dashboard/channels/${id}/edit`);
  };

  const handleDelete = (id: string) => {
    const channel = loaderData.channels.find((c) => c.id === id);
    if (channel) {
      setDeleteModal({ open: true, channel });
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.channel) return;

    setIsDeleting(true);
    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("channelId", deleteModal.channel.id);

    await fetch("/dashboard/channels", {
      method: "POST",
      body: formData,
    });

    setIsDeleting(false);
    setDeleteModal({ open: false, channel: null });
    // Refresh the page
    navigate("/dashboard/channels", { replace: true });
  };

  return (
    <>
      <ChannelsListPage
        channels={loaderData.channels}
        onEditChannel={handleEdit}
        onDeleteChannel={handleDelete}
      />
      {deleteModal.channel && (
        <DeleteChannelModal
          opened={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, channel: null })}
          onConfirm={confirmDelete}
          channelName={deleteModal.channel.name}
          configCount={deleteModal.channel.configCount}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
