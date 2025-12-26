import {
  Title,
  Text,
  SimpleGrid,
  Paper,
  Stack,
  Group,
  ThemeIcon,
  Badge,
} from "@mantine/core";
import { IconWebhook, IconSearch, IconHistory } from "@tabler/icons-react";

export interface DashboardStats {
  channelCount: number;
  configCount: number;
  enabledConfigCount: number;
}

export interface DashboardHomePageProps {
  stats: DashboardStats;
}

export function DashboardHomePage({ stats }: DashboardHomePageProps) {
  return (
    <Stack gap="lg" data-testid="dashboard-home-page">
      <div>
        <Title order={2} data-testid="page-title">
          Dashboard
        </Title>
        <Text c="dimmed">Manage your HotUKDeals Discord notifications</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper p="lg" radius="md" withBorder data-testid="stat-channels">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="light">
              <IconWebhook size={24} />
            </ThemeIcon>
            <div>
              <Text size="xl" fw={700}>
                {stats.channelCount}
              </Text>
              <Text size="sm" c="dimmed">
                Channels
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="lg" radius="md" withBorder data-testid="stat-search-terms">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="light" color="green">
              <IconSearch size={24} />
            </ThemeIcon>
            <div>
              <Group gap="xs">
                <Text size="xl" fw={700}>
                  {stats.configCount}
                </Text>
                {stats.enabledConfigCount < stats.configCount && (
                  <Badge size="sm" variant="light">
                    {stats.enabledConfigCount} active
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed">
                Search Terms
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="lg" radius="md" withBorder data-testid="stat-notifications">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="light" color="orange">
              <IconHistory size={24} />
            </ThemeIcon>
            <div>
              <Text size="xl" fw={700}>
                --
              </Text>
              <Text size="sm" c="dimmed">
                Deals Today
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
