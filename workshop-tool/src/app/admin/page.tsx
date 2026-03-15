"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RoadmapGrid from "@/components/roadmap-grid";
import { STATUS_COLORS, type StatusType } from "@/lib/constants";

// --- Types ---
interface Session {
  id: string;
  name: string;
  active: boolean;
  _count?: { projects: number; groups: number };
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  sessionId: string;
}

interface Group {
  id: string;
  name: string;
  token: string;
  sessionId: string;
  _count?: { placements: number };
}

interface Placement {
  projectId: string;
  groupId: string;
  horizon: number | null;
  status: string | null;
  group?: { name: string };
}

interface RoadmapResult {
  projectId: string;
  horizon: number | null;
  status: string | null;
  groups: string[];
  groupNames: string[];
  isPlaced: boolean;
  project: Project;
}

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Session
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [newSessionName, setNewSessionName] = useState("");

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");

  // Table view
  const [placements, setPlacements] = useState<Placement[]>([]);

  // Roadmap view
  const [roadmapData, setRoadmapData] = useState<RoadmapResult[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // --- Data loaders (declared before useEffects) ---
  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    const data = await res.json();
    setSessions(data);
    if (data.length > 0) {
      setActiveSession((prev) => prev || data[0]);
    }
  }, []);

  const loadProjects = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/projects?sessionId=${sessionId}`);
    setProjects(await res.json());
  }, []);

  const loadGroups = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/groups?sessionId=${sessionId}`);
    setGroups(await res.json());
  }, []);

  const loadPlacements = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/placements?sessionId=${sessionId}`);
    setPlacements(await res.json());
  }, []);

  const loadRoadmap = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/roadmap/${sessionId}`);
    const data = await res.json();
    setRoadmapData(data.results || []);
  }, []);

  // Check auth
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) router.push("/");
        else {
          setAuthenticated(true);
          loadSessions();
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router, loadSessions]);

  // Load session data when active session changes
  useEffect(() => {
    if (activeSession) {
      loadProjects(activeSession.id);
      loadGroups(activeSession.id);
      loadPlacements(activeSession.id);
      loadRoadmap(activeSession.id);
    }
  }, [activeSession?.id, loadProjects, loadGroups, loadPlacements, loadRoadmap]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !activeSession) return;
    const interval = setInterval(() => {
      loadPlacements(activeSession.id);
      loadRoadmap(activeSession.id);
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, activeSession, loadPlacements, loadRoadmap]);

  // CRUD: Sessions
  const createSession = async () => {
    if (!newSessionName.trim()) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSessionName }),
    });
    if (res.ok) {
      const session = await res.json();
      setNewSessionName("");
      await loadSessions();
      setActiveSession(session);
      toast.success("Session created");
    }
  };

  const toggleSessionActive = async () => {
    if (!activeSession) return;
    const res = await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !activeSession.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setActiveSession(updated);
      toast.success(updated.active ? "Links activated" : "Links killed — groups can no longer edit");
      loadSessions();
    }
  };

  // CRUD: Projects
  const saveProject = async () => {
    if (!projectName.trim() || !activeSession) return;
    if (editProject) {
      await fetch(`/api/projects/${editProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, description: projectDesc }),
      });
      toast.success("Project updated");
    } else {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          name: projectName,
          description: projectDesc,
        }),
      });
      toast.success("Project added");
    }
    setProjectDialogOpen(false);
    setEditProject(null);
    setProjectName("");
    setProjectDesc("");
    loadProjects(activeSession.id);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    toast.success("Project deleted");
    if (activeSession) loadProjects(activeSession.id);
  };

  // CRUD: Groups
  const createGroup = async () => {
    if (!newGroupName.trim() || !activeSession) return;
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSession.id, name: newGroupName }),
    });
    setNewGroupName("");
    toast.success("Group created");
    loadGroups(activeSession.id);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this group? All their placements will be lost.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    toast.success("Group deleted");
    if (activeSession) loadGroups(activeSession.id);
  };

  const getGroupLink = (token: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/group/${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getGroupLink(token));
    toast.success("Link copied to clipboard");
  };

  // Final roadmap save
  const handleFinalDragEnd = async (
    projectId: string,
    status: string | null,
    horizon: number | null
  ) => {
    setRoadmapData((prev) =>
      prev.map((r) =>
        r.projectId === projectId
          ? { ...r, status, horizon, isPlaced: status !== null && horizon !== null }
          : r
      )
    );

    if (activeSession && !activeSession.active) {
      const allPlacements = roadmapData.map((r) =>
        r.projectId === projectId
          ? { projectId, status, horizon }
          : { projectId: r.projectId, status: r.status, horizon: r.horizon }
      );
      await fetch(`/api/final/${activeSession.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements: allPlacements }),
      });
      toast.success("Position saved");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  // Table view helpers
  const getPlacementForCell = (projectId: string, groupId: string) => {
    return placements.find(
      (p) => p.projectId === projectId && p.groupId === groupId
    );
  };

  const formatPlacement = (p: Placement | undefined) => {
    if (!p || !p.status || p.horizon === null) return "—";
    return `${p.status} / H${(p.horizon ?? 0) + 1}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-4xl font-bold text-primary">Workshop Roadmap</h1>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            value={activeSession?.id || ""}
            onChange={(e) => {
              const s = sessions.find((s) => s.id === e.target.value);
              if (s) setActiveSession(s);
            }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.active ? "🟢" : "🔴"}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* New Session */}
      {sessions.length === 0 && (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center gap-3 p-4">
            <Input
              placeholder="Session name (e.g., Season III Workshop)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={createSession}>Create Session</Button>
          </CardContent>
        </Card>
      )}

      {activeSession && (
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="bg-card">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap View</TabsTrigger>
          </TabsList>

          {/* === PROJECTS TAB === */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Projects</h2>
                <p className="text-sm text-muted-foreground">
                  Manage the list of projects/initiatives for this session
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditProject(null);
                    setProjectName("");
                    setProjectDesc("");
                    setProjectDialogOpen(true);
                  }}
                >
                  + Add Project
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              {projects.map((p) => (
                <Card key={p.id} className="border-border/30 bg-card/50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {p.description && (
                        <div className="text-sm text-muted-foreground">{p.description}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditProject(p);
                          setProjectName(p.name);
                          setProjectDesc(p.description || "");
                          setProjectDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteProject(p.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {projects.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-muted-foreground">
                  No projects yet. Click &quot;+ Add Project&quot; to get started.
                </div>
              )}
            </div>
          </TabsContent>

          {/* === GROUPS TAB === */}
          <TabsContent value="groups" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Groups</h2>
                <p className="text-sm text-muted-foreground">
                  Create groups and share unique links with group leaders
                </p>
              </div>
              <Button
                variant={activeSession.active ? "destructive" : "default"}
                onClick={toggleSessionActive}
              >
                {activeSession.active ? "🔒 Kill All Links" : "🔓 Activate Links"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Input
                placeholder="Group name (e.g., BU TCD)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="max-w-sm"
                onKeyDown={(e) => e.key === "Enter" && createGroup()}
              />
              <Button onClick={createGroup}>+ Add Group</Button>
            </div>

            <div className="grid gap-2">
              {groups.map((g) => (
                <Card key={g.id} className="border-border/30 bg-card/50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{g.name}</div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {g._count?.placements || 0} placements
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="max-w-[300px] truncate rounded bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                        {getGroupLink(g.token)}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyLink(g.token)}>
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteGroup(g.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!activeSession.active && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                ⚠️ Links are currently killed. Group leaders cannot make changes.
                You can now finalize the roadmap in the Roadmap View tab.
              </div>
            )}
          </TabsContent>

          {/* === TABLE VIEW === */}
          <TabsContent value="table" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Table View</h2>
                <p className="text-sm text-muted-foreground">
                  See how each group has ranked every project
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => activeSession && loadPlacements(activeSession.id)}>
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Project</TableHead>
                    {groups.map((g) => (
                      <TableHead key={g.id} className="min-w-[140px] text-center">
                        {g.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      {groups.map((g) => {
                        const placement = getPlacementForCell(p.id, g.id);
                        const text = formatPlacement(placement);
                        const status = placement?.status as StatusType | undefined;
                        return (
                          <TableCell key={g.id} className="text-center">
                            {status && STATUS_COLORS[status] ? (
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: STATUS_COLORS[status].bg,
                                  color: STATUS_COLORS[status].text,
                                  borderColor: STATUS_COLORS[status].border,
                                }}
                              >
                                {text}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{text}</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* === ROADMAP VIEW === */}
          <TabsContent value="roadmap" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  {activeSession.active ? "Consolidated Roadmap" : "Final Roadmap (Editable)"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeSession.active
                    ? "Projects placed by majority rule across all groups"
                    : "Drag and drop to finalize the roadmap"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-muted-foreground">Auto-refresh:</label>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  {autoRefresh && (
                    <>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="w-16"
                      />
                      <span className="text-muted-foreground">sec</span>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => activeSession && loadRoadmap(activeSession.id)}>
                  Refresh Now
                </Button>
              </div>
            </div>

            <RoadmapGrid
              projects={roadmapData
                .filter((r) => r.isPlaced)
                .map((r) => ({
                  id: r.projectId,
                  name: r.project?.name || "",
                  description: r.project?.description,
                  status: r.status,
                  horizon: r.horizon,
                  groupNames: r.groupNames,
                  isPlaced: true,
                }))}
              inboxProjects={roadmapData
                .filter((r) => !r.isPlaced)
                .map((r) => ({
                  id: r.projectId,
                  name: r.project?.name || "",
                  description: r.project?.description,
                  groupNames: r.groupNames,
                  isPlaced: false,
                }))}
              onDragEnd={handleFinalDragEnd}
              readOnly={activeSession.active}
              showGroupBadges={true}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProject ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Falcon Launch Program"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProject}>
              {editProject ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
