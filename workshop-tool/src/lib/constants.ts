export const STATUSES = ["PROTECT", "GROW", "EXPAND", "REIMAGINE"] as const;
export type StatusType = (typeof STATUSES)[number];

export const HORIZONS = [
  { index: 0, name: "Horizon 1", sub: "Core" },
  { index: 1, name: "Horizon 2", sub: "Adjacency" },
  { index: 2, name: "Horizon 3", sub: "Transformational" },
] as const;

export const STATUS_COLORS: Record<StatusType, { bg: string; text: string; border: string }> = {
  PROTECT: {
    bg: "var(--status-protect-bg)",
    text: "var(--status-protect)",
    border: "var(--status-protect)"
  },
  GROW: {
    bg: "var(--status-grow-bg)",
    text: "var(--status-grow)",
    border: "var(--status-grow)"
  },
  EXPAND: {
    bg: "var(--status-expand-bg)",
    text: "var(--status-expand)",
    border: "var(--status-expand)"
  },
  REIMAGINE: {
    bg: "var(--status-reimagine-bg)",
    text: "var(--status-reimagine)",
    border: "var(--status-reimagine)"
  },
};

export const STATUS_DEFINITIONS: Record<StatusType, string> = {
  PROTECT: "Maintain and secure current operations, mitigating risks and defending market share.",
  GROW: "Scale existing products within current markets to drive increased revenue and volume.",
  EXPAND: "Leverage capabilities to enter adjacent markets, new segments, or new channels.",
  REIMAGINE: "Explore transformational innovations and entirely new business models for the future.",
};

export const HORIZON_COLORS = [
  { border: "#3b82f6", text: "#3b82f6" },
  { border: "#8b5cf6", text: "#8b5cf6" },
  { border: "#10b981", text: "#10b981" },
];

export const PRIORITY_COLORS: Record<string, { border: string; bg: string }> = {
  "in-progress": { border: "#10b981", bg: "#10b98120" }, // Green
  "in-discussion": { border: "#eab308", bg: "#eab30820" }, // Yellow
  "to-plan": { border: "#ef4444", bg: "#ef444420" }, // Red
};

export const PROJECT_CATEGORIES = [
  { value: "NPD", label: "NPD" },
  { value: "Technology", label: "Technology" },
  { value: "CoE", label: "CoE" },
  { value: "DAC", label: "DAC" },
  { value: "ID", label: "ID" },
  { value: "PMO", label: "PMO" },
  { value: "AMIT", label: "AMIT" },
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]["value"];

// The fraction of total groups that must agree on a placement for it to be considered consensus.
export const MAJORITY_THRESHOLD = 0.3;

// Validation Rules for group placements
export const RULE_MAX_H1_PROJECTS = 12;
export const RULE_MAX_H2_PROJECTS = 12;
export const RULE_MAX_H3_PROJECTS = 12;
export const RULE_MIN_UNPLACED_PERCENTAGE = 0.2; // 20%
export const RULE_CATEGORY_LIMITS: Record<string, number> = {
  NPD: 5,
  CoE: 5,
  Technology: 3,
};
