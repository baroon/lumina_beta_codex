import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AudienceSelector } from "./AudienceSelector";

const audiences = ["Job seekers", "Hiring managers", "Recruiters", "Students"];
const counts = { "Job seekers": 18, "Hiring managers": 7, Recruiters: 2, Students: 0 };

function Demo({ initial }: { initial: string[] }) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <div className="p-8">
      <AudienceSelector
        allAudienceNames={audiences}
        selectedNames={v}
        onChange={setV}
        countsByName={counts}
      />
    </div>
  );
}

const meta: Meta<typeof AudienceSelector> = {
  title: "Molecules/AudienceSelector",
  component: AudienceSelector,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof AudienceSelector>;

export const AllSelected: Story = { render: () => <Demo initial={[]} /> };
export const SomeSelected: Story = { render: () => <Demo initial={["Job seekers"]} /> };
export const EmptyWorkspace: Story = {
  render: () => (
    <div className="p-8">
      <AudienceSelector allAudienceNames={[]} selectedNames={[]} onChange={() => {}} />
    </div>
  ),
};
