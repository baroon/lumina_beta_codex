import { useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  /** Column definitions — see @tanstack/react-table docs for the full surface. */
  columns: ColumnDef<TData, unknown>[];
  data: readonly TData[];
  /**
   * Stable identity for each row. When omitted the row index is used,
   * which is fine for static tables but breaks if rows reorder under
   * sort (React reuses the wrong row instance). Always pass this for
   * tables that sort or filter client-side.
   */
  getRowId?: (row: TData, index: number) => string;
  /** Initial sort state. Empty = no sort applied at mount. */
  initialSorting?: SortingState;
  /** Rendered inside the body when `data` is empty. Plain string is wrapped in a styled <p>. */
  emptyMessage?: React.ReactNode;
  /** Optional outer wrapper className — caller controls width / margin. */
  className?: string;
}

/**
 * Generic sortable data table built on @tanstack/react-table v8. Columns
 * declare their own header / cell renderers via the `ColumnDef` shape,
 * which keeps custom row content (badges, dropdowns, external-link
 * cells) inside the column definition rather than inline in the table
 * markup.
 *
 * Out of the box: click-to-sort with the standard three-state cycle
 * (asc → desc → unsorted), sticky table-header within the scroll
 * container, and a default empty-state message. Pagination, column
 * resize, and filtering can be layered on later — the underlying
 * tanstack instance is already configured, callers just need a prop +
 * a row-model registration.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  initialSorting,
  emptyMessage = "No rows.",
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);

  const table = useReactTable<TData>({
    data: data as TData[],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  return (
    <div className={cn("overflow-x-auto rounded-md border border-neutral-200 bg-white", className)}>
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const Icon =
                  sorted === false ? ArrowDownUp : sorted === "asc" ? ArrowUp : ArrowDown;
                const meta = header.column.columnDef.meta as
                  | { align?: "left" | "right"; className?: string }
                  | undefined;
                const align = meta?.align ?? "left";
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "px-3 py-2 text-[10px] font-medium",
                      align === "right" && "text-right",
                      meta?.className,
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Sort by ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.id}`}
                        aria-sort={
                          sorted === false ? "none" : sorted === "asc" ? "ascending" : "descending"
                        }
                        className={cn(
                          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors",
                          sorted ? "text-primary-700" : "text-neutral-500 hover:text-neutral-700",
                          align === "right" && "justify-end",
                        )}
                      >
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <Icon
                          size={10}
                          aria-hidden
                          className={sorted ? "text-primary-500" : "text-neutral-400"}
                        />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-3 text-center text-neutral-500">
                {typeof emptyMessage === "string" ? (
                  <span className="text-xs">{emptyMessage}</span>
                ) : (
                  emptyMessage
                )}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { align?: "left" | "right"; className?: string; cellClassName?: string }
                    | undefined;
                  const align = meta?.align ?? "left";
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2 align-top text-neutral-700",
                        align === "right" && "text-right tabular-nums",
                        meta?.cellClassName,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
