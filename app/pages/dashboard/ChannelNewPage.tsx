import { Title, Text, Stack, Paper } from "@mantine/core";
import { ChannelForm, type ChannelFormValues } from "~/components/channels";

export interface ChannelNewPageProps {
  onSubmit: (values: ChannelFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ChannelNewPage({
  onSubmit,
  onCancel,
  isSubmitting,
}: ChannelNewPageProps) {
  return (
    <Stack gap="lg" data-testid="channel-new-page">
      <div>
        <Title order={2} data-testid="page-title">
          Add Channel
        </Title>
        <Text c="dimmed">Create a new Discord webhook channel</Text>
      </div>

      <Paper withBorder p="lg" maw={500}>
        <ChannelForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          submitLabel="Create Channel"
        />
      </Paper>
    </Stack>
  );
}
