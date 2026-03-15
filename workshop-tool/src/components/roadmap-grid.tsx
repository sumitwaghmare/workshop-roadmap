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
import { STATUSES, HORIZONS, STATUS_COLORS, HORIZON_COLORS, StatusType } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

// --- Types ---
export interface ProjectItem {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  horizon?: number | null;
  status?: string | null;
  groups?: string[];
  groupNames?: string[];
  isPlaced?: boolean;
}

interface RoadmapGridProps {
  projects: ProjectItem[];
  inboxProjects: ProjectItem[];
  onDragEnd: (projectId: string, status: string | null, horizon: number | null) => void;
  readOnly?: boolean;
  showGroupBadges?: boolean;
  title?: string;
}

// --- Draggable Project Card ---
function DraggableCard({
  project,
  showGroupBadges,
  readOnly,
}: {
  project: ProjectItem;
  showGroupBadges?: boolean;
  readOnly?: boolean;
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
      style={style}
      className={`group relative rounded-md border border-border/50 bg-white/5 px-3 py-2.5 text-sm transition-all hover:bg-white/10 ${
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
      title={project.description || ""}
    >
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">{project.name}</span>
      </div>
      {showGroupBadges && project.groupNames && project.groupNames.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {project.groupNames.map((gn, i) => (
            <Badge
              key={i}
              variant="outline"
              className="border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
            >
              {gn}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Droppable Cell ---
function DroppableCell({
  id,
  status,
  horizonIndex,
  children,
}: {
  id: string;
  status: string;
  horizonIndex: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const colors = STATUS_COLORS[status as StatusType];

  return (
    <div
      ref={setNodeRef}
      className="flex min-h-[180px] flex-col gap-2 rounded-xl border p-3 transition-all"
      style={{
        background: isOver ? `${colors.bg.replace("0.15", "0.3")}` : colors.bg,
        borderColor: isOver ? colors.border : "rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}

// --- Inbox Drop Zone ---
function InboxDropZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: "inbox" });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-xl border border-dashed p-3 transition-all ${
        isOver
          ? "border-primary bg-primary/10"
          : "border-border/50 bg-white/[0.02]"
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
      onDragEnd(projectId, status, parseInt(horizonStr));
    }
  };

  const activeProject = activeId
    ? [...projects, ...inboxProjects].find((p) => p.id === activeId)
    : null;

  // Build grid data: map (status, horizon) -> projects
  const gridData = new Map<string, ProjectItem[]>();
  for (const s of STATUSES) {
    for (const h of HORIZONS) {
      gridData.set(`${s}|${h.index}`, []);
    }
  }
  for (const p of projects) {
    if (p.status && p.horizon != null) {
      const key = `${p.status}|${p.horizon}`;
      gridData.get(key)?.push(p);
    }
  }

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
        <InboxDropZone>
          {inboxProjects.map((p) => (
            <DraggableCard
              key={p.id}
              project={p}
              showGroupBadges={showGroupBadges}
              readOnly={readOnly}
            />
          ))}
        </InboxDropZone>

        {/* Main Grid */}
        <div className="overflow-x-auto">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "140px repeat(3, 1fr)",
              minWidth: "900px",
            }}
          >
            {/* Header row */}
            <div /> {/* empty corner */}
            {HORIZONS.map((h, i) => (
              <div
                key={h.index}
                className="rounded-t-xl border-b-4 bg-card px-4 py-3 text-center font-bold uppercase tracking-wider"
                style={{
                  borderColor: HORIZON_COLORS[i].border,
                  color: HORIZON_COLORS[i].text,
                }}
              >
                {h.name}
                <div className="mt-1 text-xs font-normal normal-case text-muted-foreground">
                  {h.sub}
                </div>
              </div>
            ))}

            {/* Grid rows */}
            {STATUSES.map((status) => (
              <React.Fragment key={status}>
                {/* Row label */}
                <div
                  className="flex items-center justify-center rounded-xl px-3 py-4 text-center font-bold uppercase tracking-wider"
                  style={{
                    background: STATUS_COLORS[status].bg,
                    color: STATUS_COLORS[status].text,
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    letterSpacing: "2px",
                    fontSize: "14px",
                  }}
                >
                  {status}
                </div>

                {/* Cells */}
                {HORIZONS.map((h) => {
                  const cellId = `${status}|${h.index}`;
                  const cellProjects = gridData.get(cellId) || [];
                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      status={status}
                      horizonIndex={h.index}
                    >
                      {cellProjects.map((p) => (
                        <DraggableCard
                          key={p.id}
                          project={p}
                          showGroupBadges={showGroupBadges}
                          readOnly={readOnly}
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
