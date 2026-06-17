import {
  Activity,
  BriefcaseBusiness,
  Compass,
  Crosshair,
  FileSearch,
  FileText,
  GitCompare,
  Globe,
  Heart,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  MessagesSquare,
  Quote,
  ScanSearch,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tags,
  Trophy,
} from "lucide-react";
import { APP_COPY } from "@/content/app";

export type NavItemConfig = {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: readonly NavItemConfig[];
};

export type NavSectionConfig = {
  label: string;
  items: readonly NavItemConfig[];
};

export const navSections: readonly NavSectionConfig[] = [
  {
    label: APP_COPY.navSections.dashboard,
    items: [{ label: APP_COPY.nav.overview, href: "/overview", icon: LayoutDashboard }],
  },
  {
    label: APP_COPY.navSections.strategy,
    items: [
      {
        label: APP_COPY.nav.lenses,
        href: "/lenses",
        icon: ScanSearch,
        children: [
          { label: APP_COPY.nav.lensDiscovery, href: "/lenses/discovery", icon: Search },
          {
            label: APP_COPY.nav.lensBuyingIntent,
            href: "/lenses/buying-intent",
            icon: ShoppingCart,
          },
          { label: APP_COPY.nav.lensCompetitive, href: "/lenses/competitive", icon: GitCompare },
          { label: APP_COPY.nav.lensSentiment, href: "/lenses/sentiment", icon: Heart },
          { label: APP_COPY.nav.lensCitations, href: "/lenses/citations", icon: Quote },
          { label: APP_COPY.nav.lensContentGaps, href: "/lenses/content-gaps", icon: FileSearch },
        ],
      },
      { label: APP_COPY.nav.recommendations, href: "/recommendations", icon: Lightbulb },
      { label: APP_COPY.nav.topics, href: "/topics", icon: Tags },
    ],
  },
  {
    label: APP_COPY.navSections.intelligence,
    items: [
      { label: APP_COPY.nav.aiQuestions, href: "/ai-questions", icon: MessagesSquare },
      { label: APP_COPY.nav.competitors, href: "/competitors", icon: Trophy },
      { label: APP_COPY.nav.sources, href: "/sources", icon: Globe },
      { label: APP_COPY.nav.claimsRisks, href: "/claims-risks", icon: ShieldAlert },
    ],
  },
  {
    label: APP_COPY.navSections.reporting,
    items: [
      { label: APP_COPY.nav.reports, href: "/reports", icon: FileText },
      { label: APP_COPY.nav.scanHistory, href: "/scan-history", icon: Activity },
    ],
  },
  {
    label: APP_COPY.navSections.setup,
    items: [
      { label: APP_COPY.nav.brandDiscovery, href: "/brand-discovery", icon: Compass },
      { label: APP_COPY.nav.trackers, href: "/trackers", icon: Crosshair },
      { label: APP_COPY.nav.brands, href: "/brands", icon: BriefcaseBusiness },
      { label: APP_COPY.nav.workspace, href: "/workspace", icon: Settings },
    ],
  },
];
