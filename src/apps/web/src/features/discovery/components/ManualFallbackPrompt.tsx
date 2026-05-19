import { Alert, AlertDescription, AlertTitle } from "@/components/atoms/alert";
import { AlertCircle } from "lucide-react";
import { DISCOVERY_COPY } from "@/content/discovery";

interface ManualFallbackPromptProps {
  message: string;
}

export function ManualFallbackPrompt({ message }: ManualFallbackPromptProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{DISCOVERY_COPY.fallback.noItemsDetected}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
