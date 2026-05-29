import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PieChart } from "lucide-react";
import { describe, expect, it } from "vitest";
import { CollapsibleCard } from "./CollapsibleCard";

describe("CollapsibleCard", () => {
  it("renders the children by default (open)", () => {
    render(
      <CollapsibleCard icon={PieChart} title="Share of voice">
        <p>chart body</p>
      </CollapsibleCard>,
    );
    expect(screen.getByText("chart body")).toBeInTheDocument();
  });

  it("hides the children when collapsed via the toggle", async () => {
    render(
      <CollapsibleCard icon={PieChart} title="Share of voice">
        <p>chart body</p>
      </CollapsibleCard>,
    );
    await userEvent.click(screen.getByRole("button", { name: /collapse share of voice/i }));
    expect(screen.queryByText("chart body")).not.toBeInTheDocument();
  });

  it("starts collapsed when defaultOpen is false", () => {
    render(
      <CollapsibleCard icon={PieChart} title="Share of voice" defaultOpen={false}>
        <p>chart body</p>
      </CollapsibleCard>,
    );
    expect(screen.queryByText("chart body")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand share of voice/i })).toBeInTheDocument();
  });

  it("re-renders the children after toggling back open", async () => {
    render(
      <CollapsibleCard icon={PieChart} title="Share of voice" defaultOpen={false}>
        <p>chart body</p>
      </CollapsibleCard>,
    );
    await userEvent.click(screen.getByRole("button", { name: /expand share of voice/i }));
    expect(screen.getByText("chart body")).toBeInTheDocument();
  });
});
