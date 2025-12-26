import {
  AppShell,
  Group,
  Title,
  NavLink,
  Avatar,
  Menu,
  ActionIcon,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconHome,
  IconWebhook,
  IconHistory,
  IconLogout,
  IconSun,
  IconMoon,
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

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: IconHome },
    { href: "/dashboard/channels", label: "Channels", icon: IconWebhook },
    { href: "/dashboard/deals", label: "Deal History", icon: IconHistory },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm" }}
      padding="md"
      data-testid="dashboard-layout"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4} data-testid="dashboard-title">
            HotUKDeals Notifier
          </Title>
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              onClick={toggleColorScheme}
              size="lg"
              aria-label="Toggle color scheme"
              data-testid="theme-toggle"
            >
              {colorScheme === "dark" ? (
                <IconSun size={20} />
              ) : (
                <IconMoon size={20} />
              )}
            </ActionIcon>
            <Menu position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  data-testid="user-menu-button"
                >
                  <Avatar
                    src={user.avatar}
                    alt={user.username}
                    size="sm"
                    radius="xl"
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" fw={500}>
                    {user.username}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {user.email}
                  </Text>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  component="a"
                  href="/auth/logout"
                  leftSection={<IconLogout size={16} />}
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

      <AppShell.Navbar p="xs" data-testid="dashboard-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            component="a"
            href={item.href}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={location.pathname === item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main data-testid="dashboard-main">{children}</AppShell.Main>
    </AppShell>
  );
}
