import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  User,
  X,
  Plus,
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
import { Input } from "@/components/atoms/input";
import { InlineEdit } from "@/components/atoms/inline-edit";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { cn } from "@/lib/utils";
import { TRACKERS_COPY } from "@/content/trackers";
import type { PromptDto, PromptOption } from "@/types/api";

const CHECK_ICONS: Record<string, LucideIcon> = {
  Discovery: Compass,
  "Buying Intent": ShoppingCart,
  "Competitor Comparison": Swords,
  "Sentiment & Trust": Heart,
  "Citation Visibility": Quote,
  "Content Gaps": FileSearch,
};

const CHECK_DESCRIPTIONS = TRACKERS_COPY.review.checkDescriptions as Record<string, string>;

interface PromptCheckGroupProps {
  title: string;
  prompts: PromptDto[];
  topics: PromptOption[];
  canAdd: boolean;
  isRegenerating?: boolean;
  onRegenerate: () => void;
  onRemove: (promptId: string) => void;
  onEdit: (promptId: string, text: string) => void;
  onAdd: (text: string, topicId: string | null) => void;
}

export function PromptCheckGroup({
  title,
  prompts,
  topics,
  canAdd,
  isRegenerating = false,
  onRegenerate,
  onRemove,
  onEdit,
  onAdd,
}: PromptCheckGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftTopic, setDraftTopic] = useState("");
  const Icon = CHECK_ICONS[title] ?? Eye;
  const description = CHECK_DESCRIPTIONS[title];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = draftText.trim();
    if (!text) return;
    onAdd(text, draftTopic || null);
    setDraftText("");
    setDraftTopic("");
    setAdding(false);
  }

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
          description={description}
          className="flex-1"
          meta={<span className="text-sm tabular-nums text-neutral-500">{prompts.length}</span>}
          actions={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              disabled={isRegenerating}
              aria-label={TRACKERS_COPY.review.regenerateCheck.replace("{check}", title)}
              title={TRACKERS_COPY.review.regenerateCheck.replace("{check}", title)}
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
            </Button>
          }
        />
      </button>

      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          <ul className="space-y-2">
            {prompts.map((prompt) => {
              const isAi = prompt.source !== "UserAdded";
              const sourceLabel = isAi
                ? TRACKERS_COPY.review.sourceAi
                : TRACKERS_COPY.review.sourceHuman;
              return (
                <li
                  key={prompt.id}
                  className="group flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3 transition-all hover:border-primary-300 hover:shadow-sm"
                >
                  <span
                    className="mt-1.5 shrink-0 text-primary-500"
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
                      className="text-neutral-900 hover:bg-primary-100"
                      multiline
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
                    className="mt-1.5 shrink-0 rounded-md p-1 text-neutral-400 opacity-0 transition-all hover:bg-primary-100 hover:text-neutral-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 group-hover:opacity-100 pointer-coarse:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          {canAdd &&
            (adding ? (
              <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
                <Input
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={TRACKERS_COPY.review.addPlaceholder}
                  className="h-8 flex-1 text-sm"
                  autoFocus
                />
                {topics.length > 0 && (
                  <Select value={draftTopic} onValueChange={setDraftTopic}>
                    <SelectTrigger selectSize="sm" className="min-w-[9rem]">
                      <SelectValue placeholder={TRACKERS_COPY.review.topicPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button type="submit" size="sm" className="h-8" disabled={!draftText.trim()}>
                  {TRACKERS_COPY.review.add}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setAdding(false)}
                >
                  {TRACKERS_COPY.review.cancel}
                </Button>
              </form>
            ) : (
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setAdding(true)}>
                <Plus className="h-3 w-3" />
                {TRACKERS_COPY.review.addCustom}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
