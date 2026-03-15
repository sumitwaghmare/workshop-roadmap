export const STATUSES = ["PROTECT", "GROW", "EXPAND", "REIMAGINE"] as const;
export type StatusType = (typeof STATUSES)[number];

export const HORIZONS = [
  { index: 0, name: "Horizon 1", sub: "Near Term" },
  { index: 1, name: "Horizon 2", sub: "Mid Term" },
  { index: 2, name: "Horizon 3", sub: "Long Term" },
] as const;

export const STATUS_COLORS: Record<StatusType, { bg: string; text: string; border: string }> = {
  PROTECT: { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "#3b82f6" },
  GROW: { bg: "rgba(139, 92, 246, 0.15)", text: "#a78bfa", border: "#8b5cf6" },
  EXPAND: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "#10b981" },
  REIMAGINE: { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "#f59e0b" },
};

export const HORIZON_COLORS = [
  { border: "#3b82f6", text: "#3b82f6" },
  { border: "#8b5cf6", text: "#8b5cf6" },
  { border: "#10b981", text: "#10b981" },
];
