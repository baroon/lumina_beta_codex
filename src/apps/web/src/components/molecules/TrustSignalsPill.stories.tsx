import type { Meta, StoryObj } from "@storybook/react";
import { TrustSignalsPill } from "./TrustSignalsPill";

const meta: Meta<typeof TrustSignalsPill> = {
  title: "Molecules/TrustSignalsPill",
  component: TrustSignalsPill,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof TrustSignalsPill>;

export const Populated: Story = {
  render: () => (
    <div className="p-8">
      <TrustSignalsPill
        allNames={["BBB Accredited", "TRUSTe Certified", "ISO 27001", "SOC 2 Type II"]}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="p-8">
      <TrustSignalsPill allNames={[]} />
    </div>
  ),
};
