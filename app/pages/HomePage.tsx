import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  ThemeIcon,
  SimpleGrid,
  Paper,
  Alert,
} from "@mantine/core";
import {
  IconBrandDiscord,
  IconSearch,
  IconBell,
  IconSettings,
  IconAlertCircle,
} from "@tabler/icons-react";

export interface HomePageProps {
  isAuthenticated: boolean;
  error?: string | null;
}

export function HomePage({ isAuthenticated, error }: HomePageProps) {
  return (
    <Container size="md" py="xl" data-testid="home-page">
      <Stack gap="xl" align="center" ta="center">
        <Stack gap="sm">
          <Title order={1} data-testid="hero-title">
            HotUKDeals Notifier
          </Title>
          <Text size="lg" c="dimmed">
            Get Discord notifications for the best deals from HotUKDeals
          </Text>
        </Stack>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Authentication Failed"
            color="red"
            data-testid="auth-error"
          >
            There was a problem signing in. Please try again.
          </Alert>
        )}

        {isAuthenticated ? (
          <Button
            component="a"
            href="/dashboard"
            size="lg"
            leftSection={<IconSettings size={20} />}
            data-testid="dashboard-button"
          >
            Go to Dashboard
          </Button>
        ) : (
          <Button
            component="a"
            href="/auth/login"
            size="lg"
            leftSection={<IconBrandDiscord size={20} />}
            color="discord"
            data-testid="login-button"
          >
            Sign in with Discord
          </Button>
        )}

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="xl">
          <Paper p="lg" radius="md" withBorder data-testid="feature-channels">
            <Stack align="center" gap="sm">
              <ThemeIcon size="xl" radius="md" variant="light">
                <IconBrandDiscord size={24} />
              </ThemeIcon>
              <Text fw={600}>Multiple Channels</Text>
              <Text size="sm" c="dimmed" ta="center">
                Send notifications to different Discord channels with separate
                webhooks
              </Text>
            </Stack>
          </Paper>

          <Paper p="lg" radius="md" withBorder data-testid="feature-search">
            <Stack align="center" gap="sm">
              <ThemeIcon size="xl" radius="md" variant="light">
                <IconSearch size={24} />
              </ThemeIcon>
              <Text fw={600}>Custom Search Terms</Text>
              <Text size="sm" c="dimmed" ta="center">
                Configure search terms with include and exclude keyword filters
              </Text>
            </Stack>
          </Paper>

          <Paper p="lg" radius="md" withBorder data-testid="feature-notifications">
            <Stack align="center" gap="sm">
              <ThemeIcon size="xl" radius="md" variant="light">
                <IconBell size={24} />
              </ThemeIcon>
              <Text fw={600}>Real-time Alerts</Text>
              <Text size="sm" c="dimmed" ta="center">
                Get notified within minutes when matching deals are posted
              </Text>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
