import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "~/test-utils";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  describe("rendering", () => {
    it("renders the container", () => {
      render(<EmptyState title="No items" description="Nothing here yet" />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("displays title", () => {
      render(<EmptyState title="No items" description="Nothing here yet" />);
      expect(screen.getByTestId("empty-state-title")).toHaveTextContent(
        "No items"
      );
    });

    it("displays description", () => {
      render(<EmptyState title="No items" description="Nothing here yet" />);
      expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
        "Nothing here yet"
      );
    });
  });

  describe("action button", () => {
    it("shows action button when actionLabel and actionHref provided", () => {
      render(
        <EmptyState
          title="No items"
          description="Nothing here yet"
          actionLabel="Add Item"
          actionHref="/add"
        />
      );
      expect(screen.getByTestId("empty-state-action")).toBeInTheDocument();
      expect(screen.getByTestId("empty-state-action")).toHaveTextContent(
        "Add Item"
      );
    });

    it("shows action button when actionLabel and onAction provided", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="No items"
          description="Nothing here yet"
          actionLabel="Add Item"
          onAction={onAction}
        />
      );
      expect(screen.getByTestId("empty-state-action")).toBeInTheDocument();
    });

    it("does not show action button when no actionLabel", () => {
      render(<EmptyState title="No items" description="Nothing here yet" />);
      expect(screen.queryByTestId("empty-state-action")).not.toBeInTheDocument();
    });

    it("calls onAction when button clicked", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <EmptyState
          title="No items"
          description="Nothing here yet"
          actionLabel="Add Item"
          onAction={onAction}
        />
      );

      await user.click(screen.getByTestId("empty-state-action"));
      expect(onAction).toHaveBeenCalled();
    });
  });
});
