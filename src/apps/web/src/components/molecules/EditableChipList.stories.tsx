import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditableChipList } from "./EditableChipList";

const meta: Meta<typeof EditableChipList> = {
  title: "Molecules/EditableChipList",
  component: EditableChipList,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EditableChipList>;

function Demo({ initial = [] as { id: string; name: string }[] }) {
  const [items, setItems] = useState(initial);
  const [counter, setCounter] = useState(1000);
  return (
    <EditableChipList
      items={items}
      addPlaceholder="Add an audience…"
      addLabel="Add audience"
      emptyLabel="Not detected."
      removeAriaSingular="audience"
      onAdd={(name) => {
        const next = { id: String(counter), name };
        setItems((prev) => [...prev, next]);
        setCounter((c) => c + 1);
      }}
      onRemove={(id) => setItems((prev) => prev.filter((it) => it.id !== id))}
    />
  );
}

export const Empty: Story = {
  render: () => <Demo />,
};

export const WithItems: Story = {
  render: () => (
    <Demo
      initial={[
        { id: "1", name: "Job seekers" },
        { id: "2", name: "HR teams" },
        { id: "3", name: "Career coaches" },
      ]}
    />
  ),
};

export const ServerError: Story = {
  render: () => (
    <EditableChipList
      items={[{ id: "1", name: "Job seekers" }]}
      addPlaceholder="Add an audience…"
      addLabel="Add audience"
      emptyLabel="Not detected."
      removeAriaSingular="audience"
      onAdd={() => {}}
      onRemove={() => {}}
      serverError="Add failed — try again."
    />
  ),
};
