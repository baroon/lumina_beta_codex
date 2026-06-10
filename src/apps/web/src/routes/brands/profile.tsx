import { useParams } from "@tanstack/react-router";
import { BrandProfileScreen } from "@/features/brands/components/BrandProfileScreen";

export function BrandProfilePage() {
  const { brandId } = useParams({ from: "/brands/$brandId/profile" });
  return <BrandProfileScreen brandId={brandId} />;
}
