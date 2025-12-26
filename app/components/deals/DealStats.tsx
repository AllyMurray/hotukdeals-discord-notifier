import { SimpleGrid, Paper, Group, Text, ThemeIcon } from "@mantine/core";
import { IconReceipt, IconClock, IconTrendingUp } from "@tabler/icons-react";

export interface DealStatsProps {
  totalDeals: number;
  dealsToday: number;
  topSearchTerm?: string;
}

export function DealStats({ totalDeals, dealsToday, topSearchTerm }: DealStatsProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" data-testid="deal-stats">
      <Paper withBorder p="md" radius="md">
        <Group>
          <ThemeIcon size="lg" variant="light">
            <IconReceipt size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700} data-testid="total-deals">
              {totalDeals}
            </Text>
            <Text size="xs" c="dimmed">
              Total Deals
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group>
          <ThemeIcon size="lg" variant="light" color="green">
            <IconClock size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700} data-testid="deals-today">
              {dealsToday}
            </Text>
            <Text size="xs" c="dimmed">
              Deals Today
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Group>
          <ThemeIcon size="lg" variant="light" color="orange">
            <IconTrendingUp size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700} lineClamp={1} data-testid="top-search-term">
              {topSearchTerm || "--"}
            </Text>
            <Text size="xs" c="dimmed">
              Top Search Term
            </Text>
          </div>
        </Group>
      </Paper>
    </SimpleGrid>
  );
}
