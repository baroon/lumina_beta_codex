import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { BRANDS_COPY } from "@/content/brands";
import { DISCOVERY_COPY } from "@/content/discovery";
import { useCreateBrand } from "../hooks/useBrands";
import { addBrandSchema, type AddBrandFormValues } from "../types";

export function AddBrandForm() {
  const createBrand = useCreateBrand();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddBrandFormValues>({
    resolver: zodResolver(addBrandSchema),
    defaultValues: { name: "", websiteUrl: "" },
  });

  const onSubmit = (data: AddBrandFormValues) => {
    createBrand.mutate(data);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{BRANDS_COPY.addBrand.title}</CardTitle>
        <CardDescription>{BRANDS_COPY.addBrand.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {createBrand.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {createBrand.error instanceof Error
                  ? createBrand.error.message
                  : DISCOVERY_COPY.errors.createBrandFailed}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{BRANDS_COPY.addBrand.nameLabel}</Label>
            <Input
              id="name"
              placeholder={BRANDS_COPY.addBrand.namePlaceholder}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-semantic-error-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">{BRANDS_COPY.addBrand.urlLabel}</Label>
            <Input
              id="websiteUrl"
              placeholder={BRANDS_COPY.addBrand.urlPlaceholder}
              {...register("websiteUrl")}
            />
            {errors.websiteUrl && (
              <p className="text-sm text-semantic-error-500">{errors.websiteUrl.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || createBrand.isPending}>
            {createBrand.isPending ? BRANDS_COPY.addBrand.submitting : BRANDS_COPY.addBrand.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
