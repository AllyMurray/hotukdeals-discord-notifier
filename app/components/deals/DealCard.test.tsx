import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "~/test-utils";
import { DealCard } from "./DealCard";

const defaultProps = {
  id: "deal-123",
  title: "Steam Deck OLED 1TB - Best Price",
  link: "https://hotukdeals.com/deal/123",
  price: "£529.99",
  merchant: "Amazon",
  searchTerm: "steam-deck",
  timestamp: Date.now(),
};

describe("DealCard", () => {
  describe("rendering", () => {
    it("renders the card", () => {
      render(<DealCard {...defaultProps} />);
      expect(screen.getByTestId("deal-card-deal-123")).toBeInTheDocument();
    });

    it("displays deal title", () => {
      render(<DealCard {...defaultProps} />);
      expect(screen.getByTestId("deal-title")).toHaveTextContent(
        "Steam Deck OLED 1TB - Best Price"
      );
    });

    it("displays price when present", () => {
      render(<DealCard {...defaultProps} />);
      expect(screen.getByTestId("deal-price")).toHaveTextContent("£529.99");
    });

    it("displays search term badge", () => {
      render(<DealCard {...defaultProps} />);
      expect(screen.getByTestId("search-term-badge")).toHaveTextContent(
        "steam-deck"
      );
    });

    it("displays merchant badge when present", () => {
      render(<DealCard {...defaultProps} />);
      expect(screen.getByTestId("merchant-badge")).toHaveTextContent("Amazon");
    });
  });

  describe("optional fields", () => {
    it("does not show price when not provided", () => {
      render(<DealCard {...defaultProps} price={undefined} />);
      expect(screen.queryByTestId("deal-price")).not.toBeInTheDocument();
    });

    it("does not show merchant when not provided", () => {
      render(<DealCard {...defaultProps} merchant={undefined} />);
      expect(screen.queryByTestId("merchant-badge")).not.toBeInTheDocument();
    });

    it("does not show timestamp when not provided", () => {
      render(<DealCard {...defaultProps} timestamp={undefined} />);
      expect(screen.queryByTestId("deal-timestamp")).not.toBeInTheDocument();
    });
  });
});
