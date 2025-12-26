import {
  AppShell,
  Group,
  NavLink,
  Avatar,
  Menu,
  ActionIcon,
  Text,
  useMantineColorScheme,
  Box,
  Stack,
  Divider,
  Burger,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconWebhook,
  IconHistory,
  IconLogout,
  IconSun,
  IconMoon,
  IconFlame,
  IconChevronRight,
} from "@tabler/icons-react";
import { useLocation } from "react-router";
import type { User } from "~/lib/auth";

export interface DashboardLayoutProps {
  user: User;
  children: React.ReactNode;
}

export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: IconHome, exact: true },
    { href: "/dashboard/channels", label: "Channels", icon: IconWebhook },
    { href: "/dashboard/deals", label: "Deal History", icon: IconHistory },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 240,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened },
      }}
      padding="lg"
      data-testid="dashboard-layout"
    >
      <AppShell.Header className="app-header">
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            {/* Mobile menu toggle */}
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
              data-testid="mobile-menu-toggle"
            />

            {/* Logo */}
            <Box
            component="a"
            href="/"
            className="app-logo"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Box className="logo-icon">
              <IconFlame size={18} stroke={2} />
            </Box>
            <Text fw={700} size="lg" style={{ letterSpacing: "-0.02em" }}>
              DealHunter
            </Text>
          </Box>
          </Group>

          {/* Right side actions */}
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              onClick={toggleColorScheme}
              size="lg"
              radius="md"
              aria-label="Toggle color scheme"
              data-testid="theme-toggle"
              style={{ transition: "all 0.2s ease" }}
            >
              {colorScheme === "dark" ? (
                <IconSun size={20} stroke={1.5} />
              ) : (
                <IconMoon size={20} stroke={1.5} />
              )}
            </ActionIcon>

            <Menu position="bottom-end" withArrow shadow="lg" radius="md">
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size={40}
                  radius="xl"
                  data-testid="user-menu-button"
                  style={{
                    border: "2px solid var(--card-border)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Avatar
                    src={user.avatar}
                    alt={user.username}
                    size={32}
                    radius="xl"
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Box px="sm" py="xs">
                  <Text size="sm" fw={600}>
                    {user.username}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user.email}
                  </Text>
                </Box>
                <Menu.Divider />
                <Menu.Item
                  component="a"
                  href="/auth/logout"
                  leftSection={<IconLogout size={16} stroke={1.5} />}
                  color="red"
                  data-testid="logout-button"
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" className="app-navbar" data-testid="dashboard-nav">
        <Stack gap={4}>
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            px="sm"
            mb={8}
            style={{ letterSpacing: "0.08em" }}
          >
            Menu
          </Text>

          {navItems.map((item, index) => (
            <NavLink
              key={item.href}
              component="a"
              href={item.href}
              onClick={closeMobile}
              label={
                <Text size="sm" fw={500}>
                  {item.label}
                </Text>
              }
              leftSection={<item.icon size={20} stroke={1.5} />}
              rightSection={
                isActive(item.href, item.exact) ? (
                  <IconChevronRight size={14} stroke={2} />
                ) : null
              }
              active={isActive(item.href, item.exact)}
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              style={{
                animation: `slideInLeft 0.3s ease-out ${index * 0.05}s forwards`,
                opacity: 0,
              }}
            />
          ))}
        </Stack>

        {/* Bottom section */}
        <Box mt="auto">
          <Divider my="md" />
          <Box
            px="sm"
            py="xs"
            style={{
              borderRadius: 10,
              background: "rgba(255, 144, 37, 0.08)",
            }}
          >
            <Text size="xs" c="dimmed" mb={4}>
              Quick tip
            </Text>
            <Text size="xs" lh={1.5}>
              Add multiple search terms per channel to track different products.
            </Text>
          </Box>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main data-testid="dashboard-main">
        <Box className="page-enter">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
