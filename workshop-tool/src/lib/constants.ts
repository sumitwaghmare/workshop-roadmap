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

export const HORIZON_COLORS = [
  { border: "#3b82f6", text: "#3b82f6" },
  { border: "#8b5cf6", text: "#8b5cf6" },
  { border: "#10b981", text: "#10b981" },
];
