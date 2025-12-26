import { Modal, Text, Group, Button, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface DeleteChannelModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channelName: string;
  configCount: number;
  isDeleting?: boolean;
}

export function DeleteChannelModal({
  opened,
  onClose,
  onConfirm,
  channelName,
  configCount,
  isDeleting = false,
}: DeleteChannelModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Channel"
      centered
      data-testid="delete-channel-modal"
    >
      <Stack gap="md">
        <Group gap="sm" c="red">
          <IconAlertTriangle size={20} />
          <Text fw={500}>This action cannot be undone</Text>
        </Group>
        <Text>
          Are you sure you want to delete <strong>{channelName}</strong>?
        </Text>
        {configCount > 0 && (
          <Text size="sm" c="dimmed">
            This will also delete {configCount} search term configuration
            {configCount !== 1 ? "s" : ""} associated with this channel.
          </Text>
        )}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isDeleting}
            data-testid="cancel-delete"
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={onConfirm}
            loading={isDeleting}
            data-testid="confirm-delete"
          >
            Delete Channel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
