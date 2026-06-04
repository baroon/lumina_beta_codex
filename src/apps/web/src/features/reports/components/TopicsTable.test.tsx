import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { TopicListItemDto } from "@/types/api";
import { TopicsTable } from "./TopicsTable";

function topic(overrides: Partial<TopicListItemDto> = {}): TopicListItemDto {
  return {
    topicId: "t1",
    topicName: "Sustainability",
    brandMentionRate: 0.5,
    brandRecommendationRate: 0.25,
    brandShareOfVoice: 0.4,
    averageBrandRank: 2.5,
    citationCount: 8,
    ownedCitationShare: 0.25,
    dominantSentiment: "Positive",
    ownershipScore: 0.5,
    ownershipBand: "Contested",
    ...overrides,
  };
}

describe("TopicsTable", () => {
  it("renders one row per topic with metric pivot", () => {
    render(
      <TopicsTable
        topics={[
          topic(),
          topic({
            topicId: "t2",
            topicName: "Urban Planning",
            citationCount: 3,
            brandMentionRate: 0.1,
          }),
        ]}
        onSelectTopic={vi.fn()}
      />,
    );
    expect(screen.getByText("Sustainability")).toBeInTheDocument();
    expect(screen.getByText("Urban Planning")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument(); // first row mention rate
    expect(screen.getByText("10.0%")).toBeInTheDocument(); // second row mention rate
    expect(screen.getAllByText("Positive").length).toBeGreaterThan(0);
  });

  it("renders empty state when topics is empty", () => {
    render(<TopicsTable topics={[]} onSelectTopic={vi.fn()} />);
    expect(screen.getByText(/no topic metrics available/i)).toBeInTheDocument();
  });

  it("renders em-dash for null rate fields rather than 0%", () => {
    // Differentiates missing data from a real zero — the aggregator emits
    // null when the denominator is undefined, e.g. SoV with zero mentions.
    render(
      <TopicsTable
        topics={[
          topic({ brandMentionRate: null, brandShareOfVoice: null, averageBrandRank: null }),
        ]}
        onSelectTopic={vi.fn()}
      />,
    );
    // At least 3 em-dashes for the three null fields.
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("calls onSelectTopic when the topic-name button is clicked", async () => {
    const onSelectTopic = vi.fn();
    render(<TopicsTable topics={[topic()]} onSelectTopic={onSelectTopic} />);
    await userEvent.click(screen.getByRole("button", { name: "Sustainability" }));
    expect(onSelectTopic).toHaveBeenCalledWith("t1");
  });

  it("renders ownership band labels + score percentage", () => {
    render(
      <TopicsTable
        topics={[
          topic({
            topicId: "a",
            topicName: "Owned topic",
            ownershipBand: "Owned",
            ownershipScore: 0.9,
          }),
          topic({
            topicId: "b",
            topicName: "Contested topic",
            ownershipBand: "Contested",
            ownershipScore: 0.5,
          }),
          topic({
            topicId: "c",
            topicName: "Lost topic",
            ownershipBand: "Lost",
            ownershipScore: 0.1,
          }),
        ]}
        onSelectTopic={vi.fn()}
      />,
    );
    expect(screen.getByText("Owned")).toBeInTheDocument();
    expect(screen.getByText("Contested")).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });
});
