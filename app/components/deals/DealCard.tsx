import { Card, Group, Text, Badge, Anchor, Stack } from "@mantine/core";
import { IconExternalLink, IconClock } from "@tabler/icons-react";

export interface DealCardProps {
  id: string;
  title: string;
  link: string;
  price?: string;
  merchant?: string;
  searchTerm: string;
  timestamp?: number;
}

export function DealCard({
  id,
  title,
  link,
  price,
  merchant,
  searchTerm,
  timestamp,
}: DealCardProps) {
  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card withBorder padding="md" radius="md" data-testid={`deal-card-${id}`}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Anchor
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            fw={500}
            lineClamp={2}
            style={{ flex: 1 }}
            data-testid="deal-title"
          >
            {title}
            <IconExternalLink size={14} style={{ marginLeft: 4 }} />
          </Anchor>
          {price && (
            <Badge size="lg" variant="filled" data-testid="deal-price">
              {price}
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          <Badge variant="light" size="sm" data-testid="search-term-badge">
            {searchTerm}
          </Badge>
          {merchant && (
            <Badge variant="outline" size="sm" data-testid="merchant-badge">
              {merchant}
            </Badge>
          )}
        </Group>

        {formattedDate && (
          <Group gap="xs" c="dimmed">
            <IconClock size={14} />
            <Text size="xs" data-testid="deal-timestamp">
              {formattedDate}
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
