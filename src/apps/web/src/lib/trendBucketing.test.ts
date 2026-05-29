import { describe, expect, it } from "vitest";
import type { EntityTrendPointDto } from "@/types/api";
import { bucketTrendPoints } from "./trendBucketing";

function pt(
  capturedAt: string,
  value: number | null,
  category: string | null = null,
): EntityTrendPointDto {
  return { scanRunId: `scan:${capturedAt}`, capturedAt, value, category };
}

describe("bucketTrendPoints", () => {
  it("returns points unchanged for day granularity", () => {
    const points = [pt("2026-05-26T10:00:00Z", 0.1), pt("2026-05-27T10:00:00Z", 0.2)];
    expect(bucketTrendPoints(points, "day")).toEqual(points);
  });

  it("returns empty array unchanged", () => {
    expect(bucketTrendPoints([], "week")).toEqual([]);
    expect(bucketTrendPoints([], "month")).toEqual([]);
  });

  it("averages numeric values within each weekly bucket", () => {
    // Both dates are in the ISO week starting Mon 2026-05-25.
    const points = [
      pt("2026-05-26T10:00:00Z", 0.2),
      pt("2026-05-28T10:00:00Z", 0.4),
      // Different week (starts Mon 2026-06-01)
      pt("2026-06-02T10:00:00Z", 0.6),
    ];
    const result = bucketTrendPoints(points, "week");
    expect(result).toHaveLength(2);
    expect(result[0].value).toBeCloseTo(0.3, 5);
    expect(result[1].value).toBeCloseTo(0.6, 5);
  });

  it("averages numeric values within each monthly bucket", () => {
    const points = [
      pt("2026-05-05T10:00:00Z", 0.2),
      pt("2026-05-27T10:00:00Z", 0.4),
      pt("2026-06-02T10:00:00Z", 0.8),
    ];
    const result = bucketTrendPoints(points, "month");
    expect(result).toHaveLength(2);
    expect(result[0].value).toBeCloseTo(0.3, 5);
    expect(result[1].value).toBeCloseTo(0.8, 5);
  });

  it("yields a null value for a bucket whose points are all null", () => {
    const points = [pt("2026-05-26T10:00:00Z", null), pt("2026-05-28T10:00:00Z", null)];
    const [bucket] = bucketTrendPoints(points, "week");
    expect(bucket.value).toBeNull();
  });

  it("skips null values when averaging numeric buckets", () => {
    const points = [
      pt("2026-05-26T10:00:00Z", null),
      pt("2026-05-27T10:00:00Z", 0.4),
      pt("2026-05-28T10:00:00Z", null),
    ];
    const [bucket] = bucketTrendPoints(points, "week");
    expect(bucket.value).toBeCloseTo(0.4, 5);
  });

  it("picks the modal category for sentiment buckets", () => {
    const points = [
      pt("2026-05-26T10:00:00Z", null, "Positive"),
      pt("2026-05-27T10:00:00Z", null, "Positive"),
      pt("2026-05-28T10:00:00Z", null, "Neutral"),
    ];
    const [bucket] = bucketTrendPoints(points, "week");
    expect(bucket.category).toBe("Positive");
  });

  it("returns null category when every point in the bucket is null", () => {
    const points = [pt("2026-05-26T10:00:00Z", null, null), pt("2026-05-27T10:00:00Z", null, null)];
    const [bucket] = bucketTrendPoints(points, "week");
    expect(bucket.category).toBeNull();
  });

  it("orders bucketed output by capturedAt ascending", () => {
    const points = [
      pt("2026-07-15T10:00:00Z", 0.7),
      pt("2026-05-15T10:00:00Z", 0.5),
      pt("2026-06-15T10:00:00Z", 0.6),
    ];
    const result = bucketTrendPoints(points, "month");
    expect(result.map((p) => p.capturedAt.slice(0, 7))).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("synthesizes a stable bucket id for React keys", () => {
    const points = [pt("2026-05-26T10:00:00Z", 0.2), pt("2026-05-28T10:00:00Z", 0.4)];
    const [bucket] = bucketTrendPoints(points, "week");
    expect(bucket.scanRunId.startsWith("bucket:")).toBe(true);
    expect(bucket.scanRunId).toBe(`bucket:${bucket.capturedAt}`);
  });
});
