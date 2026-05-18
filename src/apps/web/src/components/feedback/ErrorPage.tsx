import { Button } from "@/components/ui/button";
import { APP_COPY } from "@/content/app";

interface ErrorPageProps {
  error?: Error;
  onReset?: () => void;
}

export function ErrorPage({ error, onReset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">
        {APP_COPY.error.title}
      </h1>
      <p className="max-w-md text-neutral-500">
        {APP_COPY.error.description}
      </p>
      {error?.message && (
        <pre className="max-w-lg rounded-md bg-neutral-100 p-4 text-left text-sm text-neutral-700">
          {error.message}
        </pre>
      )}
      {onReset && (
        <Button onClick={onReset}>{APP_COPY.error.retry}</Button>
      )}
    </div>
  );
}
