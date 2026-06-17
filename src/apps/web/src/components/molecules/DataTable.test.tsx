import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";

interface Row {
  id: string;
  name: string;
  count: number;
}

const sample: Row[] = [
  { id: "a", name: "Beta", count: 5 },
  { id: "b", name: "Alpha", count: 12 },
  { id: "c", name: "Gamma", count: 8 },
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "count", header: "Count", meta: { align: "right" } },
];

function rowNames(): string[] {
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent ?? "");
}

describe("DataTable", () => {
  it("renders one row per data item with the column headers", () => {
    render(<DataTable data={sample} columns={columns} getRowId={(r) => r.id} />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("button", { name: /Sort by Name/i })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /Sort by Count/i })).toBeInTheDocument();
    // Insertion order: Beta, Alpha, Gamma — unsorted view preserves data order.
    expect(rowNames()).toEqual(["Beta", "Alpha", "Gamma"]);
  });

  it("renders the empty-state message when data is empty", () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="No rows to show yet." />);
    expect(screen.getByText(/no rows to show yet/i)).toBeInTheDocument();
  });

  it("sorts by a column when its header button is clicked (asc → desc cycle)", async () => {
    render(<DataTable data={sample} columns={columns} getRowId={(r) => r.id} />);
    const nameHeader = screen.getByRole("button", { name: /Sort by Name/i });

    // First click: ascending → Alpha, Beta, Gamma.
    await userEvent.click(nameHeader);
    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

    // Second click: descending → Gamma, Beta, Alpha.
    await userEvent.click(nameHeader);
    expect(rowNames()).toEqual(["Gamma", "Beta", "Alpha"]);
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("honours initialSorting on mount", () => {
    render(
      <DataTable
        data={sample}
        columns={columns}
        getRowId={(r) => r.id}
        initialSorting={[{ id: "count", desc: true }]}
      />,
    );
    // Highest count first: Alpha (12), Gamma (8), Beta (5).
    expect(rowNames()).toEqual(["Alpha", "Gamma", "Beta"]);
  });

  it("supports a custom cell renderer", () => {
    const customColumns: ColumnDef<Row>[] = [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span data-testid={`cell-${row.original.id}`}>★ {row.original.name}</span>
        ),
      },
      { accessorKey: "count", header: "Count" },
    ];
    render(<DataTable data={sample} columns={customColumns} getRowId={(r) => r.id} />);
    expect(screen.getByTestId("cell-a")).toHaveTextContent("★ Beta");
    expect(screen.getByTestId("cell-b")).toHaveTextContent("★ Alpha");
  });

  it("renders right-aligned numeric cells with tabular-nums when meta.align='right'", () => {
    render(<DataTable data={sample} columns={columns} getRowId={(r) => r.id} />);
    const cells = within(screen.getByRole("table")).getAllByRole("cell");
    // Find the first count cell (second cell in first row).
    const countCell = cells.find((c) => c.textContent === "5");
    expect(countCell?.className).toContain("text-right");
    expect(countCell?.className).toContain("tabular-nums");
  });
});
