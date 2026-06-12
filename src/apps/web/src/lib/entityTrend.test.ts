import { describe, it, expect } from "vitest";
import type { EntityTrendSeriesDto } from "@/types/api";
import { findEntityTrend } from "./entityTrend";

function series(overrides: Partial<EntityTrendSeriesDto>): EntityTrendSeriesDto {
  return {
    entityType: "Brand",
    entityId: "b1",
    entityName: "Acme",
    metricName: "BrandMentionRate",
    seriesKind: "Numeric",
    points: [],
    ...overrides,
  };
}

describe("findEntityTrend", () => {
  it("returns the BrandMentionRate series for a tracked Brand row", () => {
    const all = [
      series({ entityId: "b1", metricName: "BrandMentionRate" }),
      series({ entityId: "b1", metricName: "MentionRate" }),
    ];
    expect(findEntityTrend(all, "Brand", "b1")?.metricName).toBe("BrandMentionRate");
  });

  it("returns the MentionRate series for a Competitor row", () => {
    const all = [
      series({ entityId: "c1", entityType: "Competitor", metricName: "MentionRate" }),
      series({ entityId: "c1", entityType: "Competitor", metricName: "BrandMentionRate" }),
    ];
    expect(findEntityTrend(all, "Competitor", "c1")?.metricName).toBe("MentionRate");
  });

  it("returns undefined when no series matches the entity id", () => {
    const all = [series({ entityId: "b1", metricName: "BrandMentionRate" })];
    expect(findEntityTrend(all, "Brand", "missing")).toBeUndefined();
  });

  it("returns undefined when the matching id has the wrong metric for the type", () => {
    // A Brand row asks for BrandMentionRate; only MentionRate is present.
    const all = [series({ entityId: "b1", metricName: "MentionRate" })];
    expect(findEntityTrend(all, "Brand", "b1")).toBeUndefined();
  });
});
