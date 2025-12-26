import { Title, Text, Stack, Button, Group, Center, Loader } from "@mantine/core";
import { DealCard, DealFilters, DealStats, type DealCardProps } from "~/components/deals";
import { EmptyState } from "~/components/ui";

export interface DealsPageProps {
  deals: DealCardProps[];
  stats: {
    totalDeals: number;
    dealsToday: number;
    topSearchTerm?: string;
  };
  searchTerms: string[];
  selectedSearchTerm: string | null;
  onSearchTermChange: (value: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore?: boolean;
}

export function DealsPage({
  deals,
  stats,
  searchTerms,
  selectedSearchTerm,
  onSearchTermChange,
  searchQuery,
  onSearchQueryChange,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: DealsPageProps) {
  return (
    <Stack gap="lg" data-testid="deals-page">
      <div>
        <Title order={2} data-testid="page-title">
          Deal History
        </Title>
        <Text c="dimmed">View processed deals and notification history</Text>
      </div>

      <DealStats
        totalDeals={stats.totalDeals}
        dealsToday={stats.dealsToday}
        topSearchTerm={stats.topSearchTerm}
      />

      <Group justify="space-between">
        <DealFilters
          searchTerms={searchTerms}
          selectedSearchTerm={selectedSearchTerm}
          onSearchTermChange={onSearchTermChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />
      </Group>

      {deals.length === 0 ? (
        <EmptyState
          title="No deals found"
          description={
            selectedSearchTerm || searchQuery
              ? "Try adjusting your filters to see more deals."
              : "Deals will appear here once the notifier processes them."
          }
        />
      ) : (
        <Stack gap="md" data-testid="deals-list">
          {deals.map((deal) => (
            <DealCard key={deal.id} {...deal} />
          ))}

          {hasMore && (
            <Center>
              <Button
                variant="light"
                onClick={onLoadMore}
                loading={isLoadingMore}
                data-testid="load-more-button"
              >
                Load More
              </Button>
            </Center>
          )}
        </Stack>
      )}
    </Stack>
  );
}
