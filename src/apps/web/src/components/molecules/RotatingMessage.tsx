import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RotatingMessageProps {
  /** Ordered list of messages to cycle through. Empty list = nothing renders. */
  messages: readonly string[];
  /** Rotation interval in milliseconds. Defaults to 6000 (6s). */
  intervalMs?: number;
  /** Extra classes on the outer card. */
  className?: string;
}

/**
 * Cycles through messages every `intervalMs` with a short cross-fade.
 * Used on the prompt-generation and scan-progress screens to give the
 * user something to read while they wait — also useful for sneaking
 * in light product education during longer-running steps.
 *
 * Re-renders on remount via a keyed inner element so the CSS
 * `animate-fade-in` plays fresh on every rotation tick.
 */
export function RotatingMessage({ messages, intervalMs = 6000, className }: RotatingMessageProps) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [messages.length, intervalMs]);

  if (messages.length === 0) return null;
  return (
    <div className={cn("rounded-md bg-neutral-50 px-4 py-3 text-sm text-neutral-700", className)}>
      <p key={index} className="animate-fade-in italic transition-opacity" aria-live="polite">
        {messages[index]}
      </p>
    </div>
  );
}
