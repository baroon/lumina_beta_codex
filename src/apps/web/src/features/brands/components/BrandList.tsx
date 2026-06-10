import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { PageHeader } from "@/components/molecules/PageHeader";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { BRANDS_COPY } from "@/content/brands";
import { useBrandsList } from "../hooks/useBrands";

export function BrandList() {
  const navigate = useNavigate();
  const brands = useBrandsList();

  if (brands.isLoading) return <LoadingPage />;

  const items = brands.data ?? [];

  return (
    <div className="mx-auto max-w-3xl p-4">
      <PageHeader title={BRANDS_COPY.list.title} description={BRANDS_COPY.list.description}>
        <Button onClick={() => navigate({ to: "/brands/new" })} className="gap-2">
          <Plus className="h-4 w-4" />
          {BRANDS_COPY.list.addBrand}
        </Button>
      </PageHeader>

      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm text-neutral-500">{BRANDS_COPY.list.empty}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((brand) => (
            <li key={brand.id}>
              <Link
                to="/brands/$brandId/profile"
                params={{ brandId: brand.id }}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-surface-card p-4 transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-neutral-900">{brand.name}</div>
                  <div className="truncate text-xs text-neutral-500">{brand.websiteUrl}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {brand.latestDiscovery && (
                    <Badge
                      variant={
                        brand.latestDiscovery.status === "Completed" ? "success" : "secondary"
                      }
                    >
                      {brand.latestDiscovery.status}
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
