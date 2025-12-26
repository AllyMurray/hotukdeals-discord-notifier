import { Group, Text, Badge, Anchor, Stack, Box } from "@mantine/core";
import {
  IconExternalLink,
  IconClock,
  IconTag,
  IconBuildingStore,
} from "@tabler/icons-react";

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
    <Box className="deal-card" data-testid={`deal-card-${id}`}>
      {/* Header with Title and Price */}
      <Group justify="space-between" align="flex-start" gap="md" mb="sm">
        <Anchor
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="deal-title"
          lineClamp={2}
          style={{ flex: 1 }}
          data-testid="deal-title"
        >
          {title}
          <IconExternalLink
            size={14}
            style={{
              marginLeft: 6,
              verticalAlign: "middle",
              opacity: 0.5,
            }}
          />
        </Anchor>

        {price && (
          <Box className="badge-price" data-testid="deal-price">
            {price}
          </Box>
        )}
      </Group>

      {/* Tags Row */}
      <Group gap="xs" mb="sm">
        <Badge
          variant="light"
          size="sm"
          leftSection={<IconTag size={12} stroke={1.5} />}
          data-testid="search-term-badge"
        >
          {searchTerm}
        </Badge>

        {merchant && (
          <Badge
            variant="outline"
            size="sm"
            leftSection={<IconBuildingStore size={12} stroke={1.5} />}
            data-testid="merchant-badge"
            style={{
              borderColor: "var(--card-border)",
            }}
          >
            {merchant}
          </Badge>
        )}
      </Group>

      {/* Timestamp */}
      {formattedDate && (
        <Group gap={6}>
          <IconClock size={14} stroke={1.5} style={{ color: "var(--text-muted)" }} />
          <Text size="xs" c="dimmed" data-testid="deal-timestamp">
            {formattedDate}
          </Text>
        </Group>
      )}
    </Box>
  );
}
