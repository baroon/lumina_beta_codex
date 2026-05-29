import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BrandSelector, type BrandSelectorEntity } from "./BrandSelector";

const trackedBrands: BrandSelectorEntity[] = [
  { id: "brand-1", entityType: "Brand", name: "Acme" },
  { id: "brand-2", entityType: "Brand", name: "Beta" },
];

const competitors: BrandSelectorEntity[] = [
  { id: "c-1", entityType: "Competitor", name: "Glassdoor" },
  { id: "c-2", entityType: "Competitor", name: "Indeed" },
  { id: "c-3", entityType: "Competitor", name: "LinkedIn" },
];

const allKeys = [...trackedBrands, ...competitors].map((e) => `${e.entityType}:${e.id}`);

function ControlledHarness({
  initial = allKeys,
  onChangeSpy,
}: {
  initial?: string[];
  onChangeSpy?: (next: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <BrandSelector
      trackedBrands={trackedBrands}
      competitors={competitors}
      selectedKeys={selected}
      onChange={(next) => {
        setSelected(next);
        onChangeSpy?.(next);
      }}
      // Disable the "Manage brands" footer link in unit tests so we don't
      // need to mount a TanStack router context.
      manageBrandsHref={null}
    />
  );
}

describe("BrandSelector", () => {
  it("button label is 'All brands' when everything is selected", () => {
    render(<ControlledHarness initial={allKeys} />);
    expect(screen.getByRole("button", { name: /brand selector/i })).toHaveTextContent("All brands");
  });

  it("button label shows count when partially selected", () => {
    render(<ControlledHarness initial={[allKeys[0]]} />);
    expect(screen.getByRole("button", { name: /brand selector/i })).toHaveTextContent(
      `1 of ${allKeys.length} brands`,
    );
  });

  it("opens the panel and renders the two sections + entities", async () => {
    render(<ControlledHarness />);
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));

    expect(screen.getByText(/^tracked brands?$/i)).toBeInTheDocument();
    // "All brands" appears in the button label AND the section header.
    expect(screen.getAllByText(/^all brands$/i).length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Glassdoor")).toBeInTheDocument();
    expect(screen.getByText("Indeed")).toBeInTheDocument();
  });

  it("marks each tracked brand row with a 'Tracked' indicator", async () => {
    render(<ControlledHarness />);
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));
    // One dot per tracked brand.
    expect(screen.getAllByLabelText(/^Tracked$/)).toHaveLength(trackedBrands.length);
  });

  it("toggling a single entity emits the new selection", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledHarness onChangeSpy={onChangeSpy} />);
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));

    const indeedCheckbox = screen.getByRole("checkbox", { name: "Indeed" });
    await userEvent.click(indeedCheckbox);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    const next = onChangeSpy.mock.calls[0][0] as string[];
    expect(next).not.toContain("Competitor:c-2");
    expect(next).toHaveLength(allKeys.length - 1);
  });

  it("section 'Select all' link selects every item in that section", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledHarness initial={[]} onChangeSpy={onChangeSpy} />);
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));

    // Two sections (Tracked + All brands) so two "Select all" buttons.
    const selectAllLinks = screen.getAllByRole("button", { name: /select all/i });
    expect(selectAllLinks).toHaveLength(2);
    // Click the one in the "All brands" section (second).
    await userEvent.click(selectAllLinks[1]);

    expect(onChangeSpy).toHaveBeenCalledOnce();
    const next = onChangeSpy.mock.calls[0][0] as string[];
    expect(next).toEqual(expect.arrayContaining(competitors.map((c) => `Competitor:${c.id}`)));
    expect(next).toHaveLength(competitors.length);
  });

  it("section link flips to 'Clear' when every item in the section is selected", async () => {
    render(<ControlledHarness initial={allKeys} />);
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));
    // Both sections are fully selected → both links read "Clear".
    expect(screen.getAllByRole("button", { name: /^clear$/i })).toHaveLength(2);
  });

  it("search filters entities by substring", async () => {
    render(<ControlledHarness />);
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));

    const search = screen.getByPlaceholderText(/search brands/i);
    await userEvent.type(search, "linked");

    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.queryByText("Glassdoor")).not.toBeInTheDocument();
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the dropdown", async () => {
    render(
      <div>
        <ControlledHarness />
        <button data-testid="outside">outside</button>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
