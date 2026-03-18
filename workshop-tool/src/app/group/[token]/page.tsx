"use client";

import { useEffect, useState, useCallback, use } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import RoadmapGrid from "@/components/roadmap-grid";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  priority?: string | null;
}

interface Placement {
  id: string;
  projectId: string;
  groupId: string;
  horizon: number | null;
  status: string | null;
}

interface GroupData {
  group: { id: string; name: string; token: string };
  session: { id: string; name: string; active: boolean };
  projects: Project[];
  placements: Placement[];
}

export default function GroupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<GroupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  // Local placements for immediate UI updates
  const [localPlacements, setLocalPlacements] = useState<Map<string, { status: string | null; horizon: number | null }>>(
    new Map()
  );

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/by-token/${token}`);
      if (!res.ok) {
        setError("Invalid or expired link");
        return;
      }
      const d: GroupData = await res.json();
      setData(d);

      // Initialize local placements from server data
      const map = new Map<string, { status: string | null; horizon: number | null }>();
      for (const p of d.placements) {
        map.set(p.projectId, { status: p.status, horizon: p.horizon });
      }
      setLocalPlacements(map);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh projects (to see new projects from other groups/admin)
  useEffect(() => {
    if (!data?.session?.active) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/groups/by-token/${token}`);
        if (res.ok) {
          const d: GroupData = await res.json();
          setData((prev) => prev ? { ...prev, projects: d.projects, session: d.session } : d);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [data?.session?.active, token]);

  const handleDragEnd = async (
    projectId: string,
    status: string | null,
    horizon: number | null
  ) => {
    if (!data?.session?.active) {
      toast.error("Session is no longer active — links have been killed");
      return;
    }

    // Update local state immediately
    setLocalPlacements((prev) => {
      const next = new Map(prev);
      next.set(projectId, { status, horizon });
      return next;
    });

    // Auto-save to server
    try {
      const res = await fetch("/api/placements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placements: [{
            projectId,
            groupId: data.group.id,
            status,
            horizon,
          }]
        }),
      });
      if (!res.ok) {
        toast.error("Failed to save placement");
      }
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleCardDoubleClick = async (item: { id: string; status?: string | null; horizon?: number | null }) => {
    if (!data?.session?.active) return;
    
    // If the project is currently placed in the grid, move it back to inbox
    if (item.status != null && item.horizon != null) {
      await handleDragEnd(item.id, null, null);
    }
  };

  const addProject = async () => {
    if (!newProjectName.trim() || !data) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: data.session?.id,
          name: newProjectName,
          description: newProjectDesc,
          createdBy: data.group?.name,
        }),
      });
      if (res.ok) {
        toast.success("Project added — visible to all groups");
        setNewProjectName("");
        setNewProjectDesc("");
        setAddDialogOpen(false);
        loadData(); // Reload to see new project
      }
    } catch {
      toast.error("Failed to add project");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-2xl font-bold text-destructive">⚠️ {error || "Unknown error"}</div>
        <p className="text-muted-foreground">
          This link may be invalid or the session may have ended.
        </p>
      </div>
    );
  }

  // Build placed and inbox lists from local state
  const placedProjects = data.projects
    .filter((p) => {
      const placement = localPlacements.get(p.id);
      return placement && placement.status !== null && placement.horizon !== null;
    })
    .map((p) => {
      const placement = localPlacements.get(p.id)!;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        icon: p.icon ?? null,
        priority: p.priority ?? null,
        status: placement.status,
        horizon: placement.horizon,
        agreedGroups: [data.group.name], // For group view, they only see their own placement as "agreed"
        isPlaced: true,
      };
    });

  const inboxProjects = data.projects
    .filter((p) => {
      const placement = localPlacements.get(p.id);
      return !placement || placement.status === null || placement.horizon === null;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon ?? null,
      priority: p.priority ?? null,
      agreedGroups: [],
      isPlaced: false,
    }));

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border/50 pb-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-primary tracking-tight text-glow">{data.session.name}</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Project Prioritization • <span className="text-foreground font-bold">{data.group.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.session.active ? (
            <Button onClick={() => setAddDialogOpen(true)} variant="outline" size="sm">
              + Add Project
            </Button>
          ) : (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              🔒 Session ended — Read-only mode
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {data.session.active && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground glass animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/20 p-1 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <div>
              <strong className="text-foreground">Instructions:</strong> Drag projects from the
              Inbox and drop them into the grid. Double-click a placed project to return it to the inbox. Your choices are saved instantly. 
              You can also contribute by adding new projects to the pool.
            </div>
          </div>
        </div>
      )}

      <RoadmapGrid
        projects={placedProjects}
        inboxProjects={inboxProjects}
        onDragEnd={handleDragEnd}
        onCardDoubleClick={handleCardDoubleClick}
        readOnly={!data.session.active}
      />

      {/* Add Project Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="glass border-border shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., New CNC Controller"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addProject}>Add Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
