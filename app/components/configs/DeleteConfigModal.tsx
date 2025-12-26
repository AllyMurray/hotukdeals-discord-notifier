import { Modal, Text, Group, Button, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface DeleteConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  searchTerm: string;
  isDeleting?: boolean;
}

export function DeleteConfigModal({
  opened,
  onClose,
  onConfirm,
  searchTerm,
  isDeleting = false,
}: DeleteConfigModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Search Term"
      centered
      data-testid="delete-config-modal"
    >
      <Stack gap="md">
        <Group gap="sm" c="red">
          <IconAlertTriangle size={20} />
          <Text fw={500}>This action cannot be undone</Text>
        </Group>
        <Text>
          Are you sure you want to delete the search term{" "}
          <strong>{searchTerm}</strong>?
        </Text>
        <Text size="sm" c="dimmed">
          You will stop receiving notifications for deals matching this search
          term.
        </Text>
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
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
