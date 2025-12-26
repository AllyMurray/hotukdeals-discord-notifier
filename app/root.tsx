import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { MantineProvider, ColorSchemeScript, Container, Title, Text, Stack } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import type { Route } from "./+types/root";
import { theme } from "./theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <Notifications />
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>{message}</Title>
        <Text>{details}</Text>
        {stack && (
          <pre style={{ overflow: "auto", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
            <code>{stack}</code>
          </pre>
        )}
      </Stack>
    </Container>
  );
}
