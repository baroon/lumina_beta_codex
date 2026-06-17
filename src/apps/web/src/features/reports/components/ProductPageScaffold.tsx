import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { PageHeader } from "@/components/molecules/PageHeader";
import type { ProductPageConfig } from "@/content/productPages";

interface ProductPageScaffoldProps {
  page: ProductPageConfig;
}

export function ProductPageScaffold({ page }: ProductPageScaffoldProps) {
  const Icon = page.icon;

  return (
    <div className="space-y-5">
      <PageHeader title={page.title} description={page.description}>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          Product v1
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Primary question
            </p>
            <p className="mt-1 text-base font-medium text-neutral-900">{page.primaryQuestion}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {page.metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                {metric.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{metric.value}</p>
              <p className="mt-1 text-xs text-neutral-500">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {page.sections.map((section) => (
          <Card key={section.title}>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-neutral-900">{section.title}</h2>
              <p className="mt-1 text-xs text-neutral-500">{section.description}</p>
              <ul className="mt-4 space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700"
                  >
                    <span>{item}</span>
                    <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                      Planned
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        {page.emptyState}
      </div>
    </div>
  );
}
