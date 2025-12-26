import {
  TextInput,
  Button,
  Stack,
  Group,
  Switch,
  TagsInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";

export interface ConfigFormValues {
  searchTerm: string;
  enabled: boolean;
  includeKeywords: string[];
  excludeKeywords: string[];
  caseSensitive: boolean;
}

export interface ConfigFormProps {
  initialValues?: Partial<ConfigFormValues>;
  onSubmit: (values: ConfigFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  isEditing?: boolean;
}

export function ConfigForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
  isEditing = false,
}: ConfigFormProps) {
  const form = useForm<ConfigFormValues>({
    initialValues: {
      searchTerm: "",
      enabled: true,
      includeKeywords: [],
      excludeKeywords: [],
      caseSensitive: false,
      ...initialValues,
    },
    validate: {
      searchTerm: (value) =>
        value.trim().length < 1 ? "Search term is required" : null,
    },
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)} data-testid="config-form">
      <Stack gap="md">
        <TextInput
          label="Search Term"
          placeholder="e.g., steam-deck, ps5, nintendo"
          required
          disabled={isEditing}
          data-testid="search-term-input"
          {...form.getInputProps("searchTerm")}
        />

        <Switch
          label="Enabled"
          description="Receive notifications for this search term"
          data-testid="enabled-switch"
          {...form.getInputProps("enabled", { type: "checkbox" })}
        />

        <TagsInput
          label="Include Keywords"
          placeholder="Press Enter to add"
          description="Deals must contain at least one of these words"
          data-testid="include-keywords-input"
          {...form.getInputProps("includeKeywords")}
        />

        <TagsInput
          label="Exclude Keywords"
          placeholder="Press Enter to add"
          description="Exclude deals containing any of these words"
          data-testid="exclude-keywords-input"
          {...form.getInputProps("excludeKeywords")}
        />

        <Switch
          label="Case Sensitive"
          description="Match keywords with exact case"
          data-testid="case-sensitive-switch"
          {...form.getInputProps("caseSensitive", { type: "checkbox" })}
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
