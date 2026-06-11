import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/atoms/button";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

const meta: Meta<typeof ConfirmDeleteDialog> = {
  title: "Molecules/ConfirmDeleteDialog",
  component: ConfirmDeleteDialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ConfirmDeleteDialog>;

function Demo({
  expectedConfirmText,
  title,
  description,
  confirmLabel,
}: {
  expectedConfirmText: string;
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen(true)} variant="destructive" size="sm">
        Open delete dialog
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        expectedConfirmText={expectedConfirmText}
        confirmLabel={confirmLabel}
        onConfirm={() => {
           
          alert("Deleted!");
          setOpen(false);
        }}
      />
    </div>
  );
}

export const DeleteBrand: Story = {
  render: () => (
    <Demo
      title="Delete brand"
      description="This permanently deletes the brand, every tracker, every scan, every prompt run, every answer, and all dimension rows. This cannot be undone."
      expectedConfirmText="Acme Corp"
      confirmLabel="Delete brand"
    />
  ),
};

export const DeleteTracker: Story = {
  render: () => (
    <Demo
      title="Delete tracker"
      description="This permanently deletes the tracker, every scan run, every prompt run, and every answer recorded for it. The owning brand and its other trackers are not affected."
      expectedConfirmText="Acme · US"
      confirmLabel="Delete tracker"
    />
  ),
};
