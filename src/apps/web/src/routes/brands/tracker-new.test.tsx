import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewTrackerPage } from "./tracker-new";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ brandId: "b1" }),
}));

vi.mock("@/features/trackers/components/ReadyToCreateTrackerScreen", () => ({
  ReadyToCreateTrackerScreen: ({ brandId }: { brandId: string }) => (
    <div data-testid="ready-to-create">{brandId}</div>
  ),
}));

describe("NewTrackerPage", () => {
  it("passes the brand route param to the tracker creation screen", () => {
    render(<NewTrackerPage />);

    expect(screen.getByTestId("ready-to-create")).toHaveTextContent("b1");
  });
});
