"use client";

import { useEffect, useState, useCallback, use } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import RoadmapGrid from "@/components/roadmap-grid";
import CountdownTimer from "@/components/countdown-timer";
import { 
  PROJECT_CATEGORIES, 
  RULE_MAX_H1_PROJECTS, 
  RULE_MIN_UNPLACED_PERCENTAGE, 
  RULE_CATEGORY_LIMITS 
} from "@/lib/constants";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  priority?: string | null;
  category?: string | null;
  pinnedHorizon?: number | null;
  pinnedStatus?: string | null;
  createdAt?: string | null;
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
  const [newProjectCategory, setNewProjectCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

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
          
          // Check for new projects
          setData((prev) => {
            if (prev) {
              const newProjects = d.projects.filter(
                (np) => !prev.projects.some((pp) => pp.id === np.id)
              );
              if (newProjects.length > 0) {
                newProjects.forEach((p) => {
                  toast.success(`New project available: ${p.name}`, {
                    description: "Keep an eye on the roadmap!",
                    icon: <div className="size-2 rounded-full bg-blue-500 animate-pulse-glow" />,
                  });
                });
              }
            }
            return prev ? { ...prev, projects: d.projects, session: d.session } : d;
          });
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [data?.session?.id, data?.session?.active, data?.projects, token]);

  const handleDragEnd = async (
    projectId: string,
    status: string | null,
    horizon: number | null
  ) => {
    if (!data?.session?.active) {
      toast.error("Session is no longer active — links have been killed");
      return;
    }

    const project = data.projects.find(p => p.id === projectId);
    if (project && project.pinnedHorizon !== null && project.pinnedHorizon !== undefined && !!project.pinnedStatus) {
      toast.error("This project is pinned and cannot be moved.");
      return;
    }

    // Evaluate constraints before applying changes
    const currentPlacement = localPlacements.get(projectId);
    const isCurrentlyH1 = currentPlacement?.horizon === 0;
    
    if (horizon === 0 && !isCurrentlyH1) {
      const h1Count = Array.from(localPlacements.values()).filter(p => p.horizon === 0).length;
      if (h1Count >= RULE_MAX_H1_PROJECTS + 2) {
        toast.error(`Horizon 1 cap severely exceeded.`);
      } else if (h1Count >= RULE_MAX_H1_PROJECTS) {
        toast('Horizon 1 cap exceeded.', { icon: '⚠️' });
      }
    }

    const isCurrentlyKillBox = !currentPlacement || currentPlacement.horizon === null || (currentPlacement.status && (currentPlacement.status.toLowerCase().includes("kill") || currentPlacement.status.toLowerCase().includes("defer")));
    const isNextKillBox = horizon === null || (status && (status.toLowerCase().includes("kill") || status.toLowerCase().includes("defer")));

    if (!isNextKillBox && isCurrentlyKillBox) {
      const placedNotKillDeferCount = Array.from(localPlacements.values()).filter(p => {
        if (p.horizon === null) return false;
        if (p.status && (p.status.toLowerCase().includes("kill") || p.status.toLowerCase().includes("defer"))) return false;
        return true;
      }).length;
      const currentKillBoxCount = data.projects.length - placedNotKillDeferCount;
      const minUnplacedReq = Math.ceil(data.projects.length * RULE_MIN_UNPLACED_PERCENTAGE);
      if (currentKillBoxCount - 1 < minUnplacedReq) {
        toast.error(`Rule 2: At least ${RULE_MIN_UNPLACED_PERCENTAGE * 100}% (${minUnplacedReq}) of projects must remain in the Inbox or be marked Kill/Defer.`);
        return;
      }
    }

    if (horizon === 0 && !isCurrentlyH1) {
      const project = data.projects.find(p => p.id === projectId);
      if (project?.category) {
        const limit = RULE_CATEGORY_LIMITS[project.category];
        if (limit !== undefined) {
          const currentH1InCategory = data.projects
            .filter(p => p.category === project.category)
            .filter(p => {
              const placement = localPlacements.get(p.id);
              return placement?.horizon === 0;
            }).length;
          if (currentH1InCategory >= limit) {
            const ruleIndex = Object.keys(RULE_CATEGORY_LIMITS).indexOf(project.category);
            const ruleNum = ruleIndex !== -1 ? 3 + ruleIndex : 3;
            toast.error(`Rule ${ruleNum}: Maximum ${limit} ${project.category} projects allowed in Horizon 1.`);
            return;
          }
        }
      }
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
          category: newProjectCategory || null,
          createdBy: data.group?.name,
        }),
      });
      if (res.ok) {
        toast.success("Project added — visible to all groups");
        setNewProjectName("");
        setNewProjectDesc("");
        setNewProjectCategory("");
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
      const isPinned = p.pinnedHorizon !== null && p.pinnedHorizon !== undefined && !!p.pinnedStatus;
      if (isPinned) return true;
      const placement = localPlacements.get(p.id);
      return placement && placement.status !== null && placement.horizon !== null;
    })
    .map((p) => {
      const isPinned = p.pinnedHorizon !== null && p.pinnedHorizon !== undefined && !!p.pinnedStatus;
      const placement = localPlacements.get(p.id);
      
      const effectiveStatus = isPinned ? p.pinnedStatus : placement!.status;
      const effectiveHorizon = isPinned ? p.pinnedHorizon : placement!.horizon;
      
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        icon: p.icon ?? null,
        priority: p.priority ?? null,
        category: p.category ?? null,
        status: effectiveStatus,
        horizon: effectiveHorizon,
        agreedGroups: [data.group.name], // For group view, they only see their own placement as "agreed"
        isPlaced: true,
        isPinned,
        createdAt: p.createdAt,
      };
    });

  const inboxProjects = data.projects
    .filter((p) => {
      const isPinned = p.pinnedHorizon !== null && p.pinnedHorizon !== undefined && !!p.pinnedStatus;
      if (isPinned) return false;
      const placement = localPlacements.get(p.id);
      return !placement || placement.status === null || placement.horizon === null;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon ?? null,
      priority: p.priority ?? null,
      category: p.category ?? null,
      agreedGroups: [],
      isPlaced: false,
      isPinned: false,
      createdAt: p.createdAt,
    }));

  const filteredInboxProjects = selectedCategory
    ? inboxProjects.filter((p) => p.category === selectedCategory)
    : inboxProjects;

  const horizon1Count = placedProjects.filter((p) => p.horizon === 0).length;
  const totalProjectsCount = data.projects.length;
  const minUnplacedRequired = Math.ceil(totalProjectsCount * RULE_MIN_UNPLACED_PERCENTAGE);
  const killBoxCount = inboxProjects.length + placedProjects.filter((p) => p.status && (p.status.toLowerCase().includes("kill") || p.status.toLowerCase().includes("defer"))).length;

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
          <ThemeToggle />
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

      {/* Rules */}
      {data.session.active && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-150 fill-mode-both">
          {/* Rule 1 */}
          <div className={`rounded-xl border p-4 text-sm flex items-start gap-3 transition-colors glass ${
            horizon1Count <= RULE_MAX_H1_PROJECTS 
              ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' 
              : horizon1Count <= RULE_MAX_H1_PROJECTS + 2
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}>
            <div className={`mt-0.5 p-1 rounded-full ${
              horizon1Count <= RULE_MAX_H1_PROJECTS 
                ? 'bg-green-500/20' 
                : horizon1Count <= RULE_MAX_H1_PROJECTS + 2
                  ? 'bg-amber-500/20'
                  : 'bg-destructive/20'
            }`}>
              {horizon1Count <= RULE_MAX_H1_PROJECTS ? <CheckCircle2 className="w-4 h-4" /> : horizon1Count <= RULE_MAX_H1_PROJECTS + 2 ? <AlertCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </div>
            <div>
              <strong className="block mb-1 text-foreground">Rule 1: The Horizon 1 Cap</strong>
              Recommended maximum {RULE_MAX_H1_PROJECTS} total projects in Horizon 1.
              <div className="mt-2 font-medium">
                Current: {horizon1Count} / {RULE_MAX_H1_PROJECTS}
              </div>
            </div>
          </div>

          {/* Rule 2 */}
          <div className={`rounded-xl border p-4 text-sm flex items-start gap-3 transition-colors glass ${
            killBoxCount >= minUnplacedRequired 
              ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' 
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}>
             <div className={`mt-0.5 p-1 rounded-full ${killBoxCount >= minUnplacedRequired ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
               {killBoxCount >= minUnplacedRequired ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
             </div>
             <div>
              <strong className="block mb-1 text-foreground">Rule 2: The Kill Box</strong>
              At least {RULE_MIN_UNPLACED_PERCENTAGE * 100}% of projects must remain unplaced or be explicitly marked &quot;Kill/Defer&quot;.
              <div className="mt-2 font-medium">
                Current: {killBoxCount} / {minUnplacedRequired} required
              </div>
            </div>
          </div>

          {/* Category Limits */}
          {Object.entries(RULE_CATEGORY_LIMITS).map(([category, limit], index) => {
            const currentH1InCategory = data.projects
              .filter(p => p.category === category)
              .filter(p => {
                const placement = localPlacements.get(p.id);
                return placement?.horizon === 0;
              }).length;
            const isValid = currentH1InCategory <= limit;
            const ruleNum = 3 + index;
            return (
              <div key={category} className={`rounded-xl border p-4 text-sm flex items-start gap-3 transition-colors glass ${
                isValid 
                  ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' 
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}>
                <div className={`mt-0.5 p-1 rounded-full ${isValid ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
                  {isValid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div>
                  <strong className="block mb-1 text-foreground">Rule {ruleNum}: {category} Limit</strong>
                  Maximum {limit} {category} projects allowed in Horizon 1.
                  <div className="mt-2 font-medium">
                    Current: {currentH1InCategory} / {limit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Inbox category:</span>
        <Button
          size="sm"
          variant={selectedCategory === "" ? "secondary" : "outline"}
          onClick={() => setSelectedCategory("")}
        >
          All
        </Button>
        {PROJECT_CATEGORIES.map((ctg) => (
          <Button
            key={ctg.value}
            size="sm"
            variant={selectedCategory === ctg.value ? "secondary" : "outline"}
            onClick={() => setSelectedCategory(ctg.value)}
          >
            {ctg.label}
          </Button>
        ))}
        {selectedCategory && (
          <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
            {filteredInboxProjects.length} of {inboxProjects.length} in {selectedCategory}
          </span>
        )}
      </div>

      {data.session.id && (
        <CountdownTimer sessionId={data.session.id} variant="floating" />
      )}
      <RoadmapGrid
        projects={placedProjects}
        inboxProjects={filteredInboxProjects}
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
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={newProjectCategory}
                onChange={(e) => setNewProjectCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="">(none)</option>
                {PROJECT_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
