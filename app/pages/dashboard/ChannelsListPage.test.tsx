import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "~/test-utils";
import { ChannelsListPage } from "./ChannelsListPage";

const mockChannels = [
  {
    id: "channel-1",
    name: "Gaming Deals",
    webhookUrl: "https://discord.com/api/webhooks/123/abc",
    configCount: 5,
    enabledConfigCount: 3,
  },
  {
    id: "channel-2",
    name: "Tech Deals",
    webhookUrl: "https://discord.com/api/webhooks/456/def",
    configCount: 2,
    enabledConfigCount: 2,
  },
];

const defaultProps = {
  channels: mockChannels,
  onEditChannel: vi.fn(),
  onDeleteChannel: vi.fn(),
};

describe("ChannelsListPage", () => {
  describe("rendering", () => {
    it("renders the page container", () => {
      render(<ChannelsListPage {...defaultProps} />);
      expect(screen.getByTestId("channels-list-page")).toBeInTheDocument();
    });

    it("renders the page title", () => {
      render(<ChannelsListPage {...defaultProps} />);
      expect(screen.getByTestId("page-title")).toHaveTextContent("Channels");
    });

    it("renders add channel button", () => {
      render(<ChannelsListPage {...defaultProps} />);
      expect(screen.getByTestId("add-channel-button")).toBeInTheDocument();
    });
  });

  describe("channels grid", () => {
    it("renders channels grid when channels exist", () => {
      render(<ChannelsListPage {...defaultProps} />);
      expect(screen.getByTestId("channels-grid")).toBeInTheDocument();
    });

    it("renders channel cards for each channel", () => {
      render(<ChannelsListPage {...defaultProps} />);
      expect(screen.getByTestId("channel-card-channel-1")).toBeInTheDocument();
      expect(screen.getByTestId("channel-card-channel-2")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no channels", () => {
      render(<ChannelsListPage {...defaultProps} channels={[]} />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("does not show empty state when channels exist", () => {
      render(<ChannelsListPage {...defaultProps} />);
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });
});
