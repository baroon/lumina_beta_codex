import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  User,
  X,
  Compass,
  ShoppingCart,
  Swords,
  Heart,
  Quote,
  FileSearch,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { InlineEdit } from "@/components/atoms/inline-edit";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { TRACKERS_COPY } from "@/content/trackers";
import type { PromptDto } from "@/types/api";

const CHECK_ICONS: Record<string, LucideIcon> = {
  Discovery: Compass,
  "Buying Intent": ShoppingCart,
  "Competitor Comparison": Swords,
  "Sentiment & Trust": Heart,
  "Citation Visibility": Quote,
  "Content Gaps": FileSearch,
};

interface PromptCheckGroupProps {
  title: string;
  prompts: PromptDto[];
  onRegenerate: () => void;
  onRemove: (promptId: string) => void;
  onEdit: (promptId: string, text: string) => void;
}

export function PromptCheckGroup({
  title,
  prompts,
  onRegenerate,
  onRemove,
  onEdit,
}: PromptCheckGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const Icon = CHECK_ICONS[title] ?? Eye;

  return (
    <div className="rounded-lg border border-neutral-200 bg-surface-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-label={(expanded
          ? TRACKERS_COPY.review.collapse
          : TRACKERS_COPY.review.expand
        ).replace("{check}", title)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
        <SectionHeader
          icon={Icon}
          title={title}
          className="flex-1"
          meta={<span className="text-sm tabular-nums text-neutral-500">{prompts.length}</span>}
          actions={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              aria-label={TRACKERS_COPY.review.regenerateCheck.replace("{check}", title)}
              title={TRACKERS_COPY.review.regenerateCheck.replace("{check}", title)}
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          }
        />
      </button>

      {expanded && (
        <ul className="space-y-2 border-t border-neutral-100 p-4">
          {prompts.map((prompt) => {
            const isAi = prompt.source !== "UserAdded";
            const sourceLabel = isAi
              ? TRACKERS_COPY.review.sourceAi
              : TRACKERS_COPY.review.sourceHuman;
            return (
              <li
                key={prompt.id}
                className="group flex items-start gap-3 rounded-lg border border-neutral-200 p-3 transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <span
                  className="mt-1.5 shrink-0 text-neutral-400"
                  aria-label={sourceLabel}
                  title={sourceLabel}
                >
                  {isAi ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <InlineEdit
                    value={prompt.text}
                    onChange={(text) => onEdit(prompt.id, text)}
                    placeholder={TRACKERS_COPY.review.editPlaceholder}
                    className="text-neutral-900"
                  />
                  {prompt.primaryTopicName && (
                    <div className="mt-1 pl-2">
                      <Badge variant="secondary">{prompt.primaryTopicName}</Badge>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(prompt.id)}
                  aria-label={`Remove prompt: ${prompt.text}`}
                  className="mt-1.5 shrink-0 rounded-md p-1 text-neutral-400 opacity-0 transition-all hover:bg-neutral-100 hover:text-neutral-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 group-hover:opacity-100 pointer-coarse:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
