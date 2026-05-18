export interface DiscoverySectionState {
  expanded: boolean;
  selectedIds: Set<string>;
}

export type DiscoverySections = Record<string, DiscoverySectionState>;
