import {
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Stack,
} from "@mantine/core";
import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconWebhook,
} from "@tabler/icons-react";

export interface ChannelCardProps {
  id: string;
  name: string;
  webhookUrl: string;
  configCount: number;
  enabledConfigCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ChannelCard({
  id,
  name,
  webhookUrl,
  configCount,
  enabledConfigCount,
  onEdit,
  onDelete,
}: ChannelCardProps) {
  const maskedWebhook = webhookUrl.replace(
    /discord\.com\/api\/webhooks\/\d+\/[^/]+/,
    "discord.com/api/webhooks/****/****"
  );

  return (
    <Card
      component="a"
      href={`/dashboard/channels/${id}`}
      withBorder
      padding="lg"
      radius="md"
      data-testid={`channel-card-${id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <IconWebhook size={20} />
          <Text fw={600} data-testid="channel-name">
            {name}
          </Text>
        </Group>
        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              onClick={(e) => e.preventDefault()}
              data-testid="channel-menu"
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit size={14} />}
              onClick={(e) => {
                e.preventDefault();
                onEdit?.();
              }}
              data-testid="edit-channel"
            >
              Edit
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={(e) => {
                e.preventDefault();
                onDelete?.();
              }}
              data-testid="delete-channel"
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Stack gap="xs">
        <Text size="sm" c="dimmed" lineClamp={1} data-testid="webhook-url">
          {maskedWebhook}
        </Text>
        <Group gap="xs">
          <Badge variant="light" size="sm" data-testid="config-count">
            {configCount} search term{configCount !== 1 ? "s" : ""}
          </Badge>
          {enabledConfigCount < configCount && (
            <Badge variant="light" size="sm" color="yellow" data-testid="enabled-count">
              {enabledConfigCount} active
            </Badge>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
