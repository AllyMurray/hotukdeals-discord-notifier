import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Box,
  Alert,
  SimpleGrid,
} from "@mantine/core";
import {
  IconBrandDiscord,
  IconSearch,
  IconBell,
  IconSettings,
  IconAlertCircle,
  IconArrowRight,
  IconFlame,
  IconWebhook,
} from "@tabler/icons-react";

export interface HomePageProps {
  isAuthenticated: boolean;
  error?: string | null;
}

export function HomePage({ isAuthenticated, error }: HomePageProps) {
  return (
    <Box data-testid="home-page">
      {/* Hero Section */}
      <Box className="hero-section" py={{ base: 60, md: 100 }}>
        <Container size="lg">
          <Stack gap="xl" align="center" ta="center" className="page-content">
            {/* Logo Mark */}
            <Box
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: "var(--gradient-flame)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--glow-flame-intense)",
                animation: "fadeInUp 0.6s ease-out forwards",
              }}
            >
              <IconFlame size={44} color="white" stroke={1.5} />
            </Box>

            {/* Hero Title */}
            <Stack
              gap={8}
              style={{
                animation: "fadeInUp 0.6s ease-out 0.1s forwards",
                opacity: 0,
              }}
            >
              <Title
                className="hero-title"
                data-testid="hero-title"
              >
                Never Miss a{" "}
                <Text component="span" className="hero-title-accent" inherit>
                  Hot Deal
                </Text>
              </Title>
              <Text
                className="hero-subtitle"
                mx="auto"
              >
                Set up custom Discord notifications for the best deals from
                HotUKDeals. Track multiple search terms, filter by keywords, and
                get alerted in real-time.
              </Text>
            </Stack>

            {error && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="Authentication Failed"
                color="red"
                radius="lg"
                data-testid="auth-error"
                style={{
                  maxWidth: 400,
                  animation: "fadeInUp 0.5s ease-out forwards",
                }}
              >
                There was a problem signing in. Please try again.
              </Alert>
            )}

            {/* CTA Buttons */}
            <Group
              gap="md"
              style={{
                animation: "fadeInUp 0.6s ease-out 0.2s forwards",
                opacity: 0,
              }}
            >
              {isAuthenticated ? (
                <Button
                  component="a"
                  href="/dashboard"
                  size="xl"
                  radius="xl"
                  className="btn-flame"
                  leftSection={<IconSettings size={22} />}
                  rightSection={<IconArrowRight size={18} />}
                  data-testid="dashboard-button"
                >
                  Open Dashboard
                </Button>
              ) : (
                <Button
                  component="a"
                  href="/auth/login"
                  size="xl"
                  radius="xl"
                  className="btn-discord"
                  leftSection={<IconBrandDiscord size={24} />}
                  rightSection={<IconArrowRight size={18} />}
                  data-testid="login-button"
                >
                  Sign in with Discord
                </Button>
              )}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container size="lg" py={{ base: 40, md: 80 }}>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={{ base: "lg", md: "xl" }}>
          <Box
            className="feature-card"
            data-testid="feature-channels"
            style={{
              animation: "fadeInUp 0.5s ease-out 0.3s forwards",
              opacity: 0,
            }}
          >
            <Box className="feature-icon">
              <IconWebhook size={28} stroke={1.5} />
            </Box>
            <Text fw={700} size="lg" mb={8}>
              Multiple Channels
            </Text>
            <Text size="sm" c="dimmed" lh={1.6}>
              Send notifications to different Discord channels with separate
              webhooks. Organize deals by category or priority.
            </Text>
          </Box>

          <Box
            className="feature-card"
            data-testid="feature-search"
            style={{
              animation: "fadeInUp 0.5s ease-out 0.4s forwards",
              opacity: 0,
            }}
          >
            <Box className="feature-icon">
              <IconSearch size={28} stroke={1.5} />
            </Box>
            <Text fw={700} size="lg" mb={8}>
              Smart Filters
            </Text>
            <Text size="sm" c="dimmed" lh={1.6}>
              Configure search terms with include and exclude keywords. Only get
              notified about deals you actually want.
            </Text>
          </Box>

          <Box
            className="feature-card"
            data-testid="feature-notifications"
            style={{
              animation: "fadeInUp 0.5s ease-out 0.5s forwards",
              opacity: 0,
            }}
          >
            <Box className="feature-icon">
              <IconBell size={28} stroke={1.5} />
            </Box>
            <Text fw={700} size="lg" mb={8}>
              Real-time Alerts
            </Text>
            <Text size="sm" c="dimmed" lh={1.6}>
              Get notified within minutes when matching deals are posted. Never
              miss a limited-time offer again.
            </Text>
          </Box>
        </SimpleGrid>
      </Container>

      {/* Footer */}
      <Container size="lg" py="xl">
        <Text size="sm" c="dimmed" ta="center">
          Built for deal hunters who refuse to pay full price.
        </Text>
      </Container>
    </Box>
  );
}
