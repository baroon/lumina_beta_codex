import {
  Package,
  Users,
  Globe,
  MessageSquare,
  Swords,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** Identity icon for each discovery section, shared across the wizard + stepper. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  brandProfile: Sparkles,
  products: Package,
  audiences: Users,
  markets: Globe,
  topics: MessageSquare,
  competitors: Swords,
  trustSignals: ShieldCheck,
};
