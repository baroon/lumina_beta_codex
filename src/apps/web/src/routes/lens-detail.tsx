import { useParams } from "@tanstack/react-router";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { ProductPageScaffold } from "@/features/reports/components/ProductPageScaffold";
import { PRODUCT_PAGES, type ProductPageConfig } from "@/content/productPages";

const LENS_PAGES: Record<string, ProductPageConfig> = {
  discovery: PRODUCT_PAGES.discoveryLens,
  "buying-intent": PRODUCT_PAGES.buyingIntentLens,
  competitive: PRODUCT_PAGES.competitiveLens,
  sentiment: PRODUCT_PAGES.sentimentLens,
  citations: PRODUCT_PAGES.citationsLens,
  "content-gaps": PRODUCT_PAGES.contentGapsLens,
};

export function LensDetailPage() {
  const { lensId } = useParams({ from: "/lenses/$lensId" });
  const page = LENS_PAGES[lensId];

  if (!page) {
    return <ErrorPage error={new Error("Lens not found")} />;
  }

  return <ProductPageScaffold page={page} />;
}
