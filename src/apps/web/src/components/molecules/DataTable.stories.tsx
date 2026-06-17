import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "./DataTable";

interface Row {
  id: string;
  name: string;
  citations: number;
  type: string;
}

const sample: Row[] = [
  { id: "1", name: "Reuters", citations: 755, type: "Editorial" },
  { id: "2", name: "Wikipedia", citations: 320, type: "Reference" },
  { id: "3", name: "Reddit", citations: 199, type: "UGC" },
  { id: "4", name: "Acme Blog", citations: 84, type: "Owned" },
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Source" },
  { accessorKey: "type", header: "Type" },
  {
    accessorKey: "citations",
    header: "Citations",
    meta: { align: "right" },
  },
];

// Storybook's `Meta<typeof DataTable>` collapses DataTable's generic to
// `unknown`, so we wrap the component in a non-generic shim that pins
// `Row` for the stories. Behaviour is identical at runtime.
function DataTableSample(props: {
  data: readonly Row[];
  emptyMessage?: string;
  initialSorting?: SortingState;
}) {
  return (
    <DataTable<Row>
      data={props.data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage={props.emptyMessage}
      initialSorting={props.initialSorting}
    />
  );
}

const meta: Meta<typeof DataTableSample> = {
  title: "Molecules/DataTable",
  component: DataTableSample,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof DataTableSample>;

export const Default: Story = {
  args: { data: sample },
};

export const Empty: Story = {
  args: {
    data: [],
    emptyMessage: "No sources cited in this window yet.",
  },
};

export const SortedDescByCitations: Story = {
  args: {
    data: sample,
    initialSorting: [{ id: "citations", desc: true }],
  },
};
