import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "~/test-utils";
import { DashboardLayout } from "./DashboardLayout";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  username: "TestUser",
  avatar: "https://example.com/avatar.png",
};

describe("DashboardLayout", () => {
  describe("rendering", () => {
    it("renders the layout container", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div>Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    });

    it("renders the title", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div>Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("dashboard-title")).toHaveTextContent(
        "HotUKDeals Notifier"
      );
    });

    it("renders navigation", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div>Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("dashboard-nav")).toBeInTheDocument();
    });

    it("renders nav links", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div>Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("nav-overview")).toBeInTheDocument();
      expect(screen.getByTestId("nav-channels")).toBeInTheDocument();
      expect(screen.getByTestId("nav-deal-history")).toBeInTheDocument();
    });

    it("renders children in main area", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div data-testid="test-content">Test Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("test-content")).toBeInTheDocument();
    });
  });

  describe("user menu", () => {
    it("renders user menu button", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div>Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("user-menu-button")).toBeInTheDocument();
    });

    it("renders theme toggle", () => {
      render(
        <DashboardLayout user={mockUser}>
          <div>Content</div>
        </DashboardLayout>
      );
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });
  });
});
