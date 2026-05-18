import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ManualFallbackPromptProps {
  message: string;
}

export function ManualFallbackPrompt({ message }: ManualFallbackPromptProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>No items detected</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
