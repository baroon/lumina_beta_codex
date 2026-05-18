import { useParams } from "@tanstack/react-router";
import { useBrand } from "@/features/brands/hooks/useBrands";
import { useDiscoveryResults } from "@/features/discovery/hooks/useDiscovery";
import { useDiscoveryProgress } from "@/features/discovery/hooks/useDiscoveryProgress";
import { DiscoveryProgressScreen } from "@/features/discovery/components/DiscoveryProgressScreen";
import { DiscoveryConfirmationScreen } from "@/features/discovery/components/DiscoveryConfirmationScreen";
import { LoadingPage } from "@/components/feedback/LoadingPage";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DiscoveryPage() {
  const { brandId } = useParams({ from: "/brands/$brandId/discovery" });
  const brand = useBrand(brandId);
  const discovery = useDiscoveryResults(brandId);
  const progress = useDiscoveryProgress(brandId);

  if (brand.isLoading) return <LoadingPage />;

  if (brand.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load brand information.</AlertDescription>
      </Alert>
    );
  }

  const status = progress.status;

  if (status === "Pending" || status === "Crawling" || status === "Extracting") {
    return (
      <DiscoveryProgressScreen
        message={progress.message}
        step={progress.step}
        totalSteps={progress.totalSteps}
      />
    );
  }

  if (status === "Failed") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Discovery failed. Please try again or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  if (discovery.isLoading) return <LoadingPage />;

  if (discovery.data) {
    return <DiscoveryConfirmationScreen results={discovery.data} />;
  }

  return <LoadingPage />;
}
