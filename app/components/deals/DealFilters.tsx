import { Group, Select, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export interface DealFiltersProps {
  searchTerms: string[];
  selectedSearchTerm: string | null;
  onSearchTermChange: (value: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function DealFilters({
  searchTerms,
  selectedSearchTerm,
  onSearchTermChange,
  searchQuery,
  onSearchQueryChange,
}: DealFiltersProps) {
  const searchTermOptions = [
    { value: "", label: "All search terms" },
    ...searchTerms.map((term) => ({ value: term, label: term })),
  ];

  return (
    <Group gap="md" data-testid="deal-filters">
      <Select
        placeholder="Filter by search term"
        data={searchTermOptions}
        value={selectedSearchTerm || ""}
        onChange={onSearchTermChange}
        clearable
        w={200}
        data-testid="search-term-filter"
      />
      <TextInput
        placeholder="Search deals..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
        w={250}
        data-testid="search-query-input"
      />
    </Group>
  );
}
