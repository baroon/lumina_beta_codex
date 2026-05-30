import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AudienceSelector } from "./AudienceSelector";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

const DEFAULT_GROUPS: BrandedDimensionGroupDto[] = [
  group("nostri", "Nostri", ["Hiring managers", "Job seekers"]),
  group("gensler", "Gensler", ["Recruiters"]),
];

function Harness({
  initial = [] as string[],
  spy,
  groups = DEFAULT_GROUPS,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  groups?: BrandedDimensionGroupDto[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <AudienceSelector
      audiencesByBrand={groups}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("AudienceSelector", () => {
  it("trigger reads 'N audiences' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /audience selector/i })).toHaveTextContent(
      "3 audiences",
    );
  });

  it("trigger reads 'No audiences' and is disabled when the workspace has none", () => {
    render(<Harness groups={[]} />);
    expect(screen.getByRole("button", { name: /audience selector/i })).toBeDisabled();
  });

  it("renders sections per brand", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /audience selector/i }));
    expect(screen.getByRole("group", { name: "Nostri" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Gensler" })).toBeInTheDocument();
  });

  it("toggling an audience off the sentinel emits the remaining names", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /audience selector/i }));
    await userEvent.click(screen.getByLabelText("Job seekers"));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(2);
    expect(next).not.toContain("Job seekers");
  });
});
