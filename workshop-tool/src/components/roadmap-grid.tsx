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
import { Edit3, Trash2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUSES, HORIZONS, STATUS_COLORS, HORIZON_COLORS, PRIORITY_COLORS, StatusType, RULE_MAX_H1_PROJECTS, RULE_MAX_H2_PROJECTS, RULE_MAX_H3_PROJECTS } from "@/lib/constants";

// --- Types ---
export interface ProjectItem {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  priority?: string | null;
  bu?: string | null;
  owner?: string | null;
  timeline?: string | null;
  category?: string | null;
  horizon?: number | null;
  status?: string | null;
  agreedGroups?: string[];
  isPlaced?: boolean;
  isPinned?: boolean;
  spocCtg?: string | null;
  spocBu?: string | null;
  createdAt?: string | null;
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
  onCardDoubleClick?: (project: ProjectItem) => void;
  horizonLimits?: Record<number, number>;
  allowInboxExpansion?: boolean;
}

// --- Draggable Project Card ---
function DraggableCard({
  project,
  showGroupBadges,
  readOnly,
  compact,
  onCardClick,
  onCardDoubleClick,
  isInbox = false,
}: {
  project: ProjectItem;
  showGroupBadges?: boolean;
  readOnly?: boolean;
  compact?: boolean;
  onCardClick?: (project: ProjectItem) => void;
  onCardDoubleClick?: (project: ProjectItem) => void;
  isInbox?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    disabled: readOnly || project.isPinned,
  });

  const priorityColor = project.priority && PRIORITY_COLORS[project.priority] ? PRIORITY_COLORS[project.priority] : null;

  const dragStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  const cardPadding = isInbox ? "px-2 py-1" : compact ? "px-2 py-1 text-xs" : "px-3 py-2.5 text-sm";
  const fontSize = isInbox ? "text-[11px]" : compact ? "text-xs" : "text-sm";

  // Check if project is "new" (added in the last 10 minutes)
  const isNew = React.useMemo(() => {
    if (!project.createdAt) return false;
    const createdDate = new Date(project.createdAt).getTime();
    const now = new Date().getTime();
    return Math.abs(now - createdDate) < 60 * 60 * 1000;
  }, [project.createdAt]);

  return (
    <div className="group relative">
      {/* Custom Tooltip - Positioned BELOW the card to avoid header clipping */}
      <div className="absolute top-full left-1/2 mt-2 w-72 -translate-x-1/2 opacity-0 -translate-y-1 invisible rounded-xl border border-border bg-popover p-3 text-xs font-normal text-popover-foreground shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible z-[110] pointer-events-none origin-bottom glass">
        <div className="flex items-center justify-between mb-2 text-left">
          <div className="font-bold text-blue-500 text-sm truncate pr-2">{project.name}</div>
          {project.category && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[9px] h-4">
              {project.category}
            </Badge>
          )}
        </div>
        
        {project.description ? (
          <div className="text-muted-foreground text-left leading-relaxed mb-3 line-clamp-4">{project.description}</div>
        ) : (
          <div className="italic text-muted-foreground/60 text-left mb-3">No description available</div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-left">
          {project.priority && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Priority:</span>
              <span className="font-bold capitalize text-[10px]" style={{ color: PRIORITY_COLORS[project.priority]?.border }}>
                {project.priority.replace(/-/g, " ")}
              </span>
            </div>
          )}
          {project.bu && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">BU:</span>
              <span className="font-bold text-[10px]">{project.bu}</span>
            </div>
          )}
          {project.owner && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Owner:</span>
              <span className="font-bold text-[10px]">{project.owner}</span>
            </div>
          )}
        </div>
        
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-t border-l border-border bg-popover" />
      </div>

      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        title={project.description || project.name}
        onClick={() => {
          if (!readOnly && !isDragging && onCardClick) {
            onCardClick(project);
          }
        }}
        onDoubleClick={() => {
          if (!readOnly && !isDragging && onCardDoubleClick) {
            onCardDoubleClick(project);
          }
        }}
        style={{
          ...dragStyle,
          ...(priorityColor ? { borderColor: priorityColor.border, backgroundColor: priorityColor.bg } : {})
        }}
        className={`relative rounded-lg border ${priorityColor ? 'border-opacity-100' : 'border-border'} bg-card/50 ${cardPadding} ${fontSize} transition-all hover:bg-card hover:border-primary/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] ${
          readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        } ${isDragging ? "z-50 ring-2 ring-primary bg-accent" : ""}`}
      >
        <div className="flex items-center gap-2">
          {isNew && (
            <div 
              className="size-2 shrink-0 rounded-full bg-red-500 animate-pulse-glow" 
              title="Recently Added"
            />
          )}
          {project.icon ? (
            <i
              className={`${project.icon} text-blue-400 ${isInbox ? 'text-sm' : 'text-lg'} leading-none`}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate font-medium">{project.name}</span>
          {project.isPinned && <span title="Pinned by Admin"><Lock size={12} className="text-amber-500 mb-0.5" /></span>}
          {project.category && (
            <Badge className="mt-1 text-[10px]" variant="secondary">
              {project.category}
            </Badge>
          )}
        </div>

        {onCardClick && !readOnly && (
          <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-background/80 p-1 text-slate-500 hover:text-slate-900 hover:bg-background">
            <Edit3 size={14} />
          </div>
        )}
        {project.isPlaced && !readOnly && !project.isPinned && !isDragging && onCardDoubleClick && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={(e) => {
              e.stopPropagation(); 
              onCardDoubleClick(project);
            }}
            className="absolute bottom-1.5 right-1.5 z-10 flex items-center justify-center rounded-md bg-background/80 p-1 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-500 opacity-60 hover:opacity-100"
            title="Move back to Inbox"
          >
            <Trash2 size={13} />
          </button>
        )}
        {showGroupBadges && project.agreedGroups && project.agreedGroups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.agreedGroups.map((gn, i) => {
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
      className={`flex ${compact ? 'min-h-[100px] p-1.5 pt-12' : 'min-h-[220px] p-3 pt-16'} flex-col gap-2 rounded-xl border transition-all relative`}
      style={{
        background: isOver ? (status === "ANY_STATUS" ? "var(--accent)" : `${colors.bg.replace("0.15", "0.4")}`) : colors.bg,
        borderColor: isOver ? colors.border : "var(--color-border)",
        boxShadow: isOver ? `0 0 20px -5px ${colors.border}` : "none",
      }}
    >
      {isOver && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 animate-pulse rounded-xl" 
          style={{ background: `radial-gradient(circle at center, ${colors.border}, transparent)` }}
        />
      )}
      {children}
    </div>
  );
}

// --- Inbox Drop Zone ---
function InboxDropZone({ 
  children, 
  isExpanded, 
  onToggleExpand,
  showExpandButton 
}: { 
  children: React.ReactNode, 
  isExpanded: boolean,
  onToggleExpand: () => void,
  showExpandButton: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "inbox" });
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-dashed transition-all glass ${
        isOver
          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          : "border-border/50 bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-3 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
          Inbox — Unplaced Projects
        </div>
        {showExpandButton && (
          <button
            onClick={onToggleExpand}
            className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 transition-colors bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
          >
            {isExpanded ? "Collapse" : "Show all"}
          </button>
        )}
      </div>
      <div 
        className={`px-4 pb-4 transition-all duration-500 ease-in-out pt-12 overflow-hidden ${
          isExpanded ? "max-h-[2000px]" : "max-h-[160px]"
        }`}
      >
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
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
  onCardDoubleClick,
  horizonLimits,
  allowInboxExpansion = false,
}: RoadmapGridProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isInboxExpanded, setIsInboxExpanded] = React.useState(false);
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
        <InboxDropZone 
          isExpanded={allowInboxExpansion ? isInboxExpanded : true}
          onToggleExpand={() => setIsInboxExpanded(!isInboxExpanded)}
          showExpandButton={allowInboxExpansion && inboxProjects.length > 10}
        >
          {inboxProjects.map((p) => (
            <DraggableCard
              key={p.id}
              project={p}
              showGroupBadges={showGroupBadges}
              readOnly={readOnly}
              compact={compact}
              onCardClick={onCardClick}
              onCardDoubleClick={onCardDoubleClick}
              isInbox={true}
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
            {visibleHorizons.map((h) => {
              const count = projects.filter(p => p.horizon === h.index).length;
              const limit = horizonLimits ? horizonLimits[h.index] : (h.index === 0 ? RULE_MAX_H1_PROJECTS : h.index === 1 ? RULE_MAX_H2_PROJECTS : h.index === 2 ? RULE_MAX_H3_PROJECTS : null);
              const isOverLimit = limit !== null && limit !== undefined && count > limit;
              const isSeverelyOverLimit = limit !== null && limit !== undefined && count > limit + 2;

              return (
                <div
                  key={h.index}
                  className={`rounded-t-xl border-b-4 bg-muted/50 backdrop-blur-sm ${compact ? 'px-2 py-1.5' : 'px-4 py-3'} text-center font-bold uppercase tracking-wider glass flex flex-col items-center justify-between`}
                  style={{
                    borderColor: HORIZON_COLORS[h.index].border,
                    color: HORIZON_COLORS[h.index].text,
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{h.name}</span>
                    <span 
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-normal leading-none shadow-sm ${
                        isSeverelyOverLimit
                          ? 'bg-destructive text-destructive-foreground' 
                          : isOverLimit
                            ? 'bg-amber-500 text-amber-950 dark:bg-amber-500/20 dark:text-amber-400 dark:border dark:border-amber-500/30'
                            : 'bg-background/80 text-foreground border border-border/50'
                      }`}
                      title={limit !== null ? `Target: ${limit}` : `Placed: ${count}`}
                    >
                      {count}{limit !== null ? ` / ${limit}` : ''}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-normal normal-case text-muted-foreground">
                    {h.sub}
                  </div>
                </div>
              );
            })}

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
                          onCardDoubleClick={onCardDoubleClick}
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
