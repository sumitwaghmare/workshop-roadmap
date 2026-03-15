"use client";

import React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Edit3 } from "lucide-react";
import { STATUSES, HORIZONS, STATUS_COLORS, HORIZON_COLORS, StatusType } from "@/lib/constants";

// --- Types ---
export interface ProjectItem {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  horizon?: number | null;
  status?: string | null;
  agreedGroups?: string[];
  isPlaced?: boolean;
}

interface RoadmapGridProps {
  projects: ProjectItem[];
  inboxProjects: ProjectItem[];
  onDragEnd: (projectId: string, status: string | null, horizon: number | null) => void;
  readOnly?: boolean;
  showGroupBadges?: boolean;
  title?: string;
  compact?: boolean;
  fitView?: boolean;
  yAxisEnabled?: boolean;
  onCardClick?: (project: ProjectItem) => void;
}

// --- Draggable Project Card ---
function DraggableCard({
  project,
  showGroupBadges,
  readOnly,
  compact,
  onCardClick,
}: {
  project: ProjectItem;
  showGroupBadges?: boolean;
  readOnly?: boolean;
  compact?: boolean;
  onCardClick?: (project: ProjectItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    disabled: readOnly,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!readOnly && !isDragging && onCardClick) {
          onCardClick(project);
        }
      }}
      style={style}
      className={`group relative rounded-lg border border-border bg-card/50 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2.5 text-sm'} transition-all hover:bg-card hover:border-primary/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] ${
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "z-50 ring-2 ring-primary bg-accent" : ""}`}
      title={project.description || ""}
    >
      <div className="flex items-center gap-2">
        {project.icon ? (
          <i
            className={`${project.icon} text-blue-400 text-lg leading-none`}
            aria-hidden="true"
            title={project.icon}
          />
        ) : null}
        <span className="truncate font-medium">{project.name}</span>
      </div>
      {onCardClick && !readOnly && (
        <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-background/80 p-1 text-slate-500 hover:text-slate-900 hover:bg-background">
          <Edit3 size={14} />
        </div>
      )}
      {showGroupBadges && project.agreedGroups && project.agreedGroups.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.agreedGroups.map((gn, i) => {
            // Extract number from "Group 1" or use initial
            const match = gn.match(/\d+/);
            const label = match ? `G${match[0]}` : gn.charAt(0).toUpperCase();
            return (
              <div
                key={i}
                title={gn}
                className="flex size-5 items-center justify-center rounded-full bg-blue-500/20 text-[9px] font-bold text-blue-400 border border-blue-500/30 cursor-help"
              >
                {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Droppable Cell ---
function DroppableCell({
  id,
  status,
  children,
  compact,
}: {
  id: string;
  status: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const colors = status === "ANY_STATUS" 
    ? { bg: "transparent", border: "var(--border)", text: "inherit" } 
    : STATUS_COLORS[status as StatusType];

  return (
    <div
      ref={setNodeRef}
      className={`flex ${compact ? 'min-h-[60px] p-1.5' : 'min-h-[180px] p-3'} flex-col gap-2 rounded-xl border transition-all relative overflow-hidden`}
      style={{
        background: isOver ? (status === "ANY_STATUS" ? "var(--accent)" : `${colors.bg.replace("0.15", "0.4")}`) : colors.bg,
        borderColor: isOver ? colors.border : "var(--color-border)",
        boxShadow: isOver ? `0 0 20px -5px ${colors.border}` : "none",
      }}
    >
      {isOver && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 animate-pulse" 
          style={{ background: `radial-gradient(circle at center, ${colors.border}, transparent)` }}
        />
      )}
      {children}
    </div>
  );
}

// --- Inbox Drop Zone ---
function InboxDropZone({ children, compact }: { children: React.ReactNode, compact?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: "inbox" });
  return (
    <div
      ref={setNodeRef}
      className={`${compact ? 'min-h-[60px] p-2' : 'min-h-[120px] p-4'} rounded-xl border border-dashed transition-all glass ${
        isOver
          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          : "border-border/50 bg-muted/30"
      }`}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Inbox — Unplaced Projects
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// --- Main Grid ---
export default function RoadmapGrid({
  projects,
  inboxProjects,
  onDragEnd,
  readOnly = false,
  showGroupBadges = false,
  title,
  compact = false,
  fitView = false,
  yAxisEnabled = true,
  onCardClick,
}: RoadmapGridProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const droppableId = over.id as string;

    if (droppableId === "inbox") {
      onDragEnd(projectId, null, null);
    } else {
      // droppableId format: "STATUS|HORIZON"
      const [status, horizonStr] = droppableId.split("|");
      onDragEnd(projectId, status === "ANY_STATUS" ? null : status, parseInt(horizonStr));
    }
  };

  const activeProject = activeId
    ? [...projects, ...inboxProjects].find((p) => p.id === activeId)
    : null;

  const activeStatuses = yAxisEnabled ? STATUSES : ["ANY_STATUS"];

  // Determine which cells actually contain projects (used for "fit view")
  const occupiedCells = new Set<string>();
  for (const p of projects) {
    if (p.horizon != null) {
      const s = yAxisEnabled && p.status ? p.status : "ANY_STATUS";
      occupiedCells.add(`${s}|${p.horizon}`);
    }
  }
  const hasAnyProjects = occupiedCells.size > 0;

  const visibleHorizons = fitView && hasAnyProjects
    ? HORIZONS.filter((h) =>
        activeStatuses.some((s) => occupiedCells.has(`${s}|${h.index}`)),
      )
    : HORIZONS;

  const visibleStatuses = fitView && hasAnyProjects
    ? activeStatuses.filter((s) =>
        visibleHorizons.some((h) => occupiedCells.has(`${s}|${h.index}`)),
      )
    : activeStatuses;

  // Build grid data: map (status, horizon) -> projects
  const gridData = new Map<string, ProjectItem[]>();
  for (const s of activeStatuses) {
    for (const h of HORIZONS) {
      gridData.set(`${s}|${h.index}`, []);
    }
  }
  
  for (const p of projects) {
    if (p.horizon != null) {
      const s = (yAxisEnabled && p.status) ? p.status : "ANY_STATUS";
      const key = `${s}|${p.horizon}`;
      gridData.get(key)?.push(p);
    }
  }

  const horizonCount = visibleHorizons.length;
  const rowLabelWidth = compact ? 100 : 140;
  const minWidth = `${rowLabelWidth + horizonCount * (compact ? 220 : 250)}px`;
  const gridTemplateColumns = `${rowLabelWidth}px repeat(${horizonCount}, minmax(0, 1fr))`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {title && (
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        )}

        {/* Inbox */}
        <InboxDropZone compact={compact}>
          {inboxProjects.map((p) => (
            <DraggableCard
              key={p.id}
              project={p}
              showGroupBadges={showGroupBadges}
              readOnly={readOnly}
              compact={compact}
              onCardClick={onCardClick}
            />
          ))}
        </InboxDropZone>

        {/* Main Grid */}
        <div className="overflow-x-auto">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns,
              minWidth,
            }}
          >
            {/* Header row */}
            <div /> {/* empty corner */}
            {visibleHorizons.map((h) => (
              <div
                key={h.index}
                className={`rounded-t-xl border-b-4 bg-muted/50 backdrop-blur-sm ${compact ? 'px-2 py-1.5' : 'px-4 py-3'} text-center font-bold uppercase tracking-wider glass`}
                style={{
                  borderColor: HORIZON_COLORS[h.index].border,
                  color: HORIZON_COLORS[h.index].text,
                }}
              >
                {h.name}
                <div className="mt-1 text-xs font-normal normal-case text-muted-foreground">
                  {h.sub}
                </div>
              </div>
            ))}

            {/* Grid rows */}
            {visibleStatuses.map((status) => (
              <React.Fragment key={status}>
                {/* Row label */}
                <div
                  className={`flex items-center justify-center rounded-xl ${compact ? 'px-1.5 py-2' : 'px-3 py-4'} text-center font-bold uppercase tracking-wider`}
                  style={status === "ANY_STATUS" ? {
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    letterSpacing: compact ? "1px" : "2px",
                    fontSize: compact ? "11px" : "14px",
                  } : {
                    background: STATUS_COLORS[status as StatusType].bg,
                    color: STATUS_COLORS[status as StatusType].text,
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    letterSpacing: compact ? "1px" : "2px",
                    fontSize: compact ? "11px" : "14px",
                  }}
                >
                  {status === "ANY_STATUS" ? "PLACED" : status}
                </div>

                {/* Cells */}
                {visibleHorizons.map((h) => {
                  const cellId = `${status}|${h.index}`;
                  const cellProjects = gridData.get(cellId) || [];
                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      status={status}
                      compact={compact}
                    >
                      {cellProjects.map((p) => (
                        <DraggableCard
                          key={p.id}
                          project={p}
                          showGroupBadges={showGroupBadges}
                          readOnly={readOnly}
                          compact={compact}
                          onCardClick={onCardClick}
                        />
                      ))}
                    </DroppableCell>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeProject ? (
          <div className="rounded-md border border-primary bg-card px-3 py-2.5 text-sm font-medium shadow-xl">
            {activeProject.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
