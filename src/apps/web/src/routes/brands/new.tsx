import { AddBrandForm } from "@/features/brands/components/AddBrandForm";
import { PageHeader } from "@/components/layout/PageHeader";

export function NewBrandPage() {
  return (
    <div>
      <PageHeader
        title="Add Brand"
        description="Enter your brand details to begin the discovery process."
      />
      <AddBrandForm />
    </div>
  );
}
