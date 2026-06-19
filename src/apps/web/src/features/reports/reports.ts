export interface ReportSectionSummaryInput {
  name: string;
  ready: boolean;
}

export interface ReportPackageSummary {
  totalSections: number;
  readySections: readonly string[];
  missingSections: readonly string[];
  readinessPercent: number;
}

export function sectionsForReportTemplate(
  templateName: string,
  allSections: readonly string[],
): readonly string[] {
  const wanted = new Set(sectionNamesForTemplate(templateName));
  if (wanted.size === 0) return allSections;
  return allSections.filter((section) => wanted.has(section));
}

function sectionNamesForTemplate(templateName: string): readonly string[] {
  switch (templateName) {
    case "Executive summary":
      return ["Executive summary", "Visibility scorecards", "Recommendations"];
    case "Weekly client update":
      return [
        "Executive summary",
        "Lens performance",
        "Recommendations",
        "Competitors",
        "Sources and citations",
        "Claims and risks",
      ];
    case "Monthly AI visibility report":
      return [];
    case "Competitive movement report":
      return ["Executive summary", "Competitors", "Recommendations", "Evidence appendix"];
    case "Content opportunities report":
      return [
        "Lens performance",
        "Recommendations",
        "Topics and content gaps",
        "Evidence appendix",
      ];
    case "Citation authority report":
      return ["Executive summary", "Sources and citations", "Recommendations", "Evidence appendix"];
    case "Risk review report":
      return ["Executive summary", "Claims and risks", "Recommendations", "Evidence appendix"];
    default:
      return [];
  }
}

export function deriveReportPackageSummary(
  sections: readonly ReportSectionSummaryInput[],
): ReportPackageSummary {
  const readySections = sections.filter((section) => section.ready).map((section) => section.name);
  const missingSections = sections
    .filter((section) => !section.ready)
    .map((section) => section.name);
  return {
    totalSections: sections.length,
    readySections,
    missingSections,
    readinessPercent:
      sections.length === 0 ? 0 : Math.round((readySections.length / sections.length) * 100),
  };
}
