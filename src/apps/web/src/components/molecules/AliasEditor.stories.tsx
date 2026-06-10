import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { AliasEditor } from "./AliasEditor";

const meta: Meta<typeof AliasEditor> = {
  title: "Molecules/AliasEditor",
  component: AliasEditor,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AliasEditor>;

function Wrapper(props: Omit<React.ComponentProps<typeof AliasEditor>, "aliases" | "onChange">) {
  const [aliases, setAliases] = useState<string[]>([]);
  return <AliasEditor {...props} aliases={aliases} onChange={setAliases} />;
}

export const Default: Story = {
  render: () => <Wrapper label="Also known as" placeholder="Add an alias..." />,
};

function PrefilledStory() {
  const [aliases, setAliases] = useState<string[]>(["Photoshop", "PS"]);
  return (
    <AliasEditor
      aliases={aliases}
      onChange={setAliases}
      label="Also known as"
      placeholder="Add an alias..."
    />
  );
}

export const Prefilled: Story = {
  render: () => <PrefilledStory />,
};

export const Inline: Story = {
  render: () => <Wrapper variant="inline" label="Aliases" placeholder="e.g. TOI, Times of India" />,
};

export const NoLabel: Story = {
  render: () => <Wrapper label={null} placeholder="Add an alias..." />,
};
