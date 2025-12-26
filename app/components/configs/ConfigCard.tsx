import {
  Card,
  Group,
  Text,
  Badge,
  Switch,
  ActionIcon,
  Menu,
  Stack,
} from "@mantine/core";
import { IconDotsVertical, IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";

export interface ConfigCardProps {
  searchTerm: string;
  enabled: boolean;
  includeKeywords: string[];
  excludeKeywords: string[];
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: (enabled: boolean) => void;
}

export function ConfigCard({
  searchTerm,
  enabled,
  includeKeywords,
  excludeKeywords,
  onEdit,
  onDelete,
  onToggle,
}: ConfigCardProps) {
  return (
    <Card withBorder padding="md" radius="md" data-testid={`config-card-${searchTerm}`}>
      <Group justify="space-between">
        <Group gap="sm">
          <IconSearch size={18} />
          <Text fw={500} data-testid="search-term">
            {searchTerm}
          </Text>
        </Group>
        <Group gap="sm">
          <Switch
            checked={enabled}
            onChange={(e) => onToggle?.(e.currentTarget.checked)}
            size="sm"
            data-testid="config-toggle"
          />
          <Menu position="bottom-end" withArrow>
            <Menu.Target>
              <ActionIcon variant="subtle" data-testid="config-menu">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={onEdit}
                data-testid="edit-config"
              >
                Edit
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={onDelete}
                data-testid="delete-config"
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {(includeKeywords.length > 0 || excludeKeywords.length > 0) && (
        <Stack gap="xs" mt="sm">
          {includeKeywords.length > 0 && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Include:
              </Text>
              {includeKeywords.map((kw) => (
                <Badge key={kw} size="xs" variant="light" color="green">
                  {kw}
                </Badge>
              ))}
            </Group>
          )}
          {excludeKeywords.length > 0 && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Exclude:
              </Text>
              {excludeKeywords.map((kw) => (
                <Badge key={kw} size="xs" variant="light" color="red">
                  {kw}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      )}
    </Card>
  );
}
