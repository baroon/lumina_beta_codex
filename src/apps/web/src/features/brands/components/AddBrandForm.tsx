import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
        <CardTitle>Add Brand</CardTitle>
        <CardDescription>
          Enter your brand details and we'll analyze your website to discover key information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {createBrand.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {createBrand.error instanceof Error ? createBrand.error.message : "Failed to create brand"}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Brand Name</Label>
            <Input id="name" placeholder="Acme Inc." {...register("name")} />
            {errors.name && <p className="text-sm text-semantic-error-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input id="websiteUrl" placeholder="https://example.com" {...register("websiteUrl")} />
            {errors.websiteUrl && <p className="text-sm text-semantic-error-500">{errors.websiteUrl.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || createBrand.isPending}>
            {createBrand.isPending ? "Analyzing..." : "Start Discovery"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
