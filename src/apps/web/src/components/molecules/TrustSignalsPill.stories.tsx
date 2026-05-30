import type { Meta, StoryObj } from "@storybook/react";
import { TrustSignalsPill } from "./TrustSignalsPill";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

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
        trustSignalsByBrand={[
          group("nostri", "Nostri", ["BBB Accredited", "TRUSTe Certified"]),
          group("gensler", "Gensler", ["ISO 27001", "SOC 2 Type II"]),
        ]}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="p-8">
      <TrustSignalsPill trustSignalsByBrand={[]} />
    </div>
  ),
};
