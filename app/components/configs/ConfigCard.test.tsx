import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "~/test-utils";
import { ConfigCard } from "./ConfigCard";

const defaultProps = {
  searchTerm: "steam-deck",
  enabled: true,
  includeKeywords: [],
  excludeKeywords: [],
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggle: vi.fn(),
};

describe("ConfigCard", () => {
  describe("rendering", () => {
    it("renders the card", () => {
      render(<ConfigCard {...defaultProps} />);
      expect(screen.getByTestId("config-card-steam-deck")).toBeInTheDocument();
    });

    it("displays search term", () => {
      render(<ConfigCard {...defaultProps} />);
      expect(screen.getByTestId("search-term")).toHaveTextContent("steam-deck");
    });

    it("renders toggle switch", () => {
      render(<ConfigCard {...defaultProps} />);
      expect(screen.getByTestId("config-toggle")).toBeInTheDocument();
    });
  });

  describe("keywords display", () => {
    it("shows include keywords when present", () => {
      render(
        <ConfigCard {...defaultProps} includeKeywords={["oled", "limited"]} />
      );
      expect(screen.getByText("oled")).toBeInTheDocument();
      expect(screen.getByText("limited")).toBeInTheDocument();
    });

    it("shows exclude keywords when present", () => {
      render(
        <ConfigCard {...defaultProps} excludeKeywords={["refurbished", "used"]} />
      );
      expect(screen.getByText("refurbished")).toBeInTheDocument();
      expect(screen.getByText("used")).toBeInTheDocument();
    });

    it("does not show keyword section when no keywords", () => {
      render(<ConfigCard {...defaultProps} />);
      expect(screen.queryByText("Include:")).not.toBeInTheDocument();
      expect(screen.queryByText("Exclude:")).not.toBeInTheDocument();
    });
  });
});
