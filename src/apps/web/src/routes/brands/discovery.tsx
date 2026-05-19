import { useParams } from "@tanstack/react-router";
import { useBrand } from "@/features/brands/hooks/useBrands";
import { useDiscoveryResults } from "@/features/discovery/hooks/useDiscovery";
import { useDiscoveryProgress } from "@/features/discovery/hooks/useDiscoveryProgress";
import { DISCOVERY_COPY } from "@/content/discovery";
import { DiscoveryProgressScreen } from "@/features/discovery/components/DiscoveryProgressScreen";
import { DiscoveryConfirmationScreen } from "@/features/discovery/components/DiscoveryConfirmationScreen";
import { DiscoveryCompleteScreen } from "@/features/discovery/components/DiscoveryCompleteScreen";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { Alert, AlertDescription } from "@/components/atoms/alert";

export function DiscoveryPage() {
  const { brandId } = useParams({ from: "/brands/$brandId/discovery" });
  const brand = useBrand(brandId);
  const discovery = useDiscoveryResults(brandId);
  const progress = useDiscoveryProgress(brandId);

  if (brand.isLoading) return <LoadingPage />;

  if (brand.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{DISCOVERY_COPY.errors.loadBrandFailed}</AlertDescription>
      </Alert>
    );
  }

  const status = progress.status;

  if (status === "Pending" || status === "Crawling" || status === "Extracting") {
    return <DiscoveryProgressScreen step={progress.step} totalSteps={progress.totalSteps} />;
  }

  if (status === "Failed") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{DISCOVERY_COPY.errors.discoveryFailed}</AlertDescription>
      </Alert>
    );
  }

  if (discovery.isLoading) return <LoadingPage />;

  if (discovery.data) {
    if (discovery.data.status === "Completed") {
      return (
        <DiscoveryCompleteScreen
          brandName={discovery.data.brandName}
          brandId={discovery.data.brandId}
        />
      );
    }
    return <DiscoveryConfirmationScreen results={discovery.data} />;
  }

  return <LoadingPage />;
}
