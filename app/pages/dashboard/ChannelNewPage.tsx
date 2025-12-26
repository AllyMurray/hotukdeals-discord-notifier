import { Title, Text, Stack, Paper } from "@mantine/core";
import { ChannelForm } from "~/components/channels";

export interface ChannelNewPageProps {
  onCancel: () => void;
}

export function ChannelNewPage({ onCancel }: ChannelNewPageProps) {
  return (
    <Stack gap="lg" data-testid="channel-new-page">
      <div>
        <Title order={2} data-testid="page-title">
          Add Channel
        </Title>
        <Text c="dimmed">Create a new Discord webhook channel</Text>
      </div>

      <Paper withBorder p="lg" maw={500}>
        <ChannelForm onCancel={onCancel} submitLabel="Create Channel" />
      </Paper>
    </Stack>
  );
}
