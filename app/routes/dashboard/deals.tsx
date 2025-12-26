import { useState } from "react";
import type { Route } from "./+types/deals";
import { DealsPage } from "~/pages/dashboard";
import { getAllConfigs } from "../../../src/db/repository";
import { HotUKDealsService } from "../../../src/db/service";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const searchTermFilter = url.searchParams.get("searchTerm");
  const limit = 50;

  // Get all unique search terms for the filter dropdown
  const configs = await getAllConfigs();
  const searchTerms = [...new Set(configs.map((c) => c.searchTerm))];

  // Query deals - using ElectroDB scan for now (pagination would need GSI)
  let query = HotUKDealsService.entities.deal.scan;

  const result = await query.go({ limit: limit + 1 });

  let deals = result.data;

  // Filter by search term if specified
  if (searchTermFilter) {
    deals = deals.filter((d) => d.searchTerm === searchTermFilter);
  }

  // Sort by timestamp descending
  deals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const hasMore = deals.length > limit;
  if (hasMore) {
    deals = deals.slice(0, limit);
  }

  // Calculate stats
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const dealsToday = deals.filter(
    (d) => d.timestamp && d.timestamp >= startOfDay
  ).length;

  // Count deals by search term
  const dealsBySearchTerm: Record<string, number> = {};
  deals.forEach((d) => {
    dealsBySearchTerm[d.searchTerm] =
      (dealsBySearchTerm[d.searchTerm] || 0) + 1;
  });

  const topSearchTerm = Object.entries(dealsBySearchTerm).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  return {
    deals: deals.map((d) => ({
      id: d.dealId,
      title: d.title,
      link: d.link,
      price: d.price,
      merchant: d.merchant,
      searchTerm: d.searchTerm,
      timestamp: d.timestamp,
    })),
    stats: {
      totalDeals: result.data.length,
      dealsToday,
      topSearchTerm,
    },
    searchTerms,
    hasMore,
  };
}

export default function Deals({ loaderData }: Route.ComponentProps) {
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter deals client-side for search query
  const filteredDeals = loaderData.deals.filter((deal) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        deal.title.toLowerCase().includes(query) ||
        deal.merchant?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSearchTermChange = (value: string | null) => {
    setSearchTerm(value);
    // Reload with new search term filter
    if (value) {
      window.location.href = `/dashboard/deals?searchTerm=${encodeURIComponent(value)}`;
    } else {
      window.location.href = "/dashboard/deals";
    }
  };

  return (
    <DealsPage
      deals={filteredDeals}
      stats={loaderData.stats}
      searchTerms={loaderData.searchTerms}
      selectedSearchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      hasMore={loaderData.hasMore}
      onLoadMore={() => {
        // Simple implementation - could be improved with cursor-based pagination
        console.log("Load more not yet implemented");
      }}
    />
  );
}
