import { TextInput, Button, Stack, Group } from "@mantine/core";
import { useForm } from "@mantine/form";

export interface ChannelFormValues {
  name: string;
  webhookUrl: string;
}

export interface ChannelFormProps {
  initialValues?: ChannelFormValues;
  onSubmit: (values: ChannelFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function ChannelForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
}: ChannelFormProps) {
  const form = useForm<ChannelFormValues>({
    initialValues: initialValues || {
      name: "",
      webhookUrl: "",
    },
    validate: {
      name: (value) =>
        value.trim().length < 1 ? "Name is required" : null,
      webhookUrl: (value) => {
        if (!value.trim()) return "Webhook URL is required";
        if (!value.includes("discord.com/api/webhooks/")) {
          return "Must be a valid Discord webhook URL";
        }
        return null;
      },
    },
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)} data-testid="channel-form">
      <Stack gap="md">
        <TextInput
          label="Channel Name"
          placeholder="e.g., Gaming Deals"
          required
          data-testid="channel-name-input"
          {...form.getInputProps("name")}
        />
        <TextInput
          label="Discord Webhook URL"
          placeholder="https://discord.com/api/webhooks/..."
          required
          data-testid="webhook-url-input"
          {...form.getInputProps("webhookUrl")}
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            data-testid="submit-button"
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
