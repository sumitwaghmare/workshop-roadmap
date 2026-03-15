export const STATUSES = ["PROTECT", "GROW", "EXPAND", "REIMAGINE"] as const;
export type StatusType = (typeof STATUSES)[number];

export const HORIZONS = [
  { index: 0, name: "Horizon 1", sub: "Core" },
  { index: 1, name: "Horizon 2", sub: "Adjacency" },
  { index: 2, name: "Horizon 3", sub: "Transformational" },
] as const;

export const STATUS_COLORS: Record<StatusType, { bg: string; text: string; border: string }> = {
  PROTECT: { bg: "rgba(56, 189, 248, 0.1)", text: "#38bdf8", border: "#0ea5e9" },
  GROW: { bg: "rgba(139, 92, 246, 0.1)", text: "#a78bfa", border: "#8b5cf6" },
  EXPAND: { bg: "rgba(16, 185, 129, 0.1)", text: "#34d399", border: "#10b981" },
  REIMAGINE: { bg: "rgba(244, 63, 94, 0.1)", text: "#fb7185", border: "#f43f5e" },
};

export const HORIZON_COLORS = [
  { border: "#3b82f6", text: "#3b82f6" },
  { border: "#8b5cf6", text: "#8b5cf6" },
  { border: "#10b981", text: "#10b981" },
];
