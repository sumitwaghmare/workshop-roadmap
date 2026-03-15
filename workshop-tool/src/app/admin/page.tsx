"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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
import { STATUSES, STATUS_COLORS, type StatusType } from "@/lib/constants";
import { 
  ClipboardCopy,
  Copy,
  Lock,
  Plus,
  Trash2, 
  Unlock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const PRIORITY_OPTIONS = [
  { value: "to-plan", label: "To Plan" },
  { value: "in-discussion", label: "In Discussion" },
  { value: "in-progress", label: "In Progress" },
];

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
  icon?: string | null;
  priority?: string | null;
  bu?: string | null;
  owner?: string | null;
  timeline?: string | null;
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
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  priority?: string | null;
  bu?: string | null;
  owner?: string | null;
  timeline?: string | null;
  horizon: number | null;
  status: string | null;
  agreedGroups: string[];
  isFinal: boolean;
  hasMajority: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Session
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [bulkGroupsText, setBulkGroupsText] = useState("");
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Table view
  const [placements, setPlacements] = useState<Placement[]>([]);

  // Roadmap view
  const [roadmapData, setRoadmapData] = useState<RoadmapResult[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [compactRoadmap, setCompactRoadmap] = useState(false);
  const [yAxisEnabled, setYAxisEnabled] = useState(true);

  // Roadmap Item Details (locked session editing)
  const [selectedRoadmapItem, setSelectedRoadmapItem] = useState<RoadmapResult | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailName, setDetailName] = useState("");
  const [detailIcon, setDetailIcon] = useState<string | null>(null);
  const [detailDescription, setDetailDescription] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<string | null>(null);
  const [detailPriority, setDetailPriority] = useState<string | null>(null);
  const [detailBu, setDetailBu] = useState<string | null>(null);
  const [detailOwner, setDetailOwner] = useState<string | null>(null);
  const [detailTimeline, setDetailTimeline] = useState<string | null>(null);

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

  const loadRoadmap = useCallback(async (sessionId: string, currentYAxis: boolean) => {
    const res = await fetch(`/api/roadmap/${sessionId}?yAxis=${currentYAxis}`);
    const data = await res.json();
    setRoadmapData(data || []);
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
    if (activeSession && authenticated) {
      loadProjects(activeSession.id);
      loadGroups(activeSession.id);
      loadPlacements(activeSession.id);
      loadRoadmap(activeSession.id, yAxisEnabled);
    }
  }, [activeSession, authenticated, loadProjects, loadGroups, loadPlacements, loadRoadmap, yAxisEnabled]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !activeSession) return;
    const interval = setInterval(() => {
      loadPlacements(activeSession.id);
      loadRoadmap(activeSession.id, yAxisEnabled);
    }, refreshInterval * 1000 || 5000); 
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, activeSession, loadPlacements, loadRoadmap, yAxisEnabled]);

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
      setIsNewSessionDialogOpen(false);
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

  const handleBulkCreateGroups = async () => {
    if (!bulkGroupsText.trim() || !activeSession) return;
    const names = bulkGroupsText.split("\n").map(n => n.trim()).filter(n => n.length > 0);
    
    for (const name of names) {
      await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id, name }),
      });
    }
    
    setBulkGroupsText("");
    setIsBulkDialogOpen(false);
    toast.success(`${names.length} groups created`);
    loadGroups(activeSession.id);
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error("Clipboard copy failed", err);
      return false;
    }
  };

  const copyAllLinks = async () => {
    const links = groups.map(g => `${g.name}: ${window.location.origin}/group/${g.token}`).join("\n");
    const ok = await copyToClipboard(links);
    if (ok) toast.success("All links copied to clipboard");
    else toast.error("Failed to copy links. Please copy manually.");
  };

  const getGroupLink = (token: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/group/${token}`;
  };

  const copyLink = async (token: string) => {
    const ok = await copyToClipboard(getGroupLink(token));
    if (ok) toast.success("Link copied to clipboard");
    else toast.error("Failed to copy link. Please copy manually.");
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this group? All their placements will be lost.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    toast.success("Group deleted");
    if (activeSession) loadGroups(activeSession.id);
  };

  // Final roadmap save
  const handleFinalDragEnd = async (
    projectId: string,
    status: string | null,
    horizon: number | null
  ) => {
    setRoadmapData((prev) =>
      (prev as RoadmapResult[]).map((r) =>
        r.id === projectId
          ? { ...r, status, horizon }
          : r
      )
    );

    if (activeSession && !activeSession.active) {
      const allPlacements = (roadmapData as RoadmapResult[]).map((r) =>
        r.id === projectId
          ? { projectId, status, horizon }
          : { projectId: r.id, status: r.status, horizon: r.horizon }
      );
      await fetch(`/api/final/${activeSession.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements: allPlacements }),
      });
      toast.success("Position saved");
    }
  };

  const openRoadmapItemDetails = (item: RoadmapResult) => {
    setSelectedRoadmapItem(item);
    setDetailName(item.name);
    setDetailIcon(item.icon ?? "");
    setDetailDescription(item.description ?? "");
    setDetailStatus(item.status ?? "");
    setDetailPriority(item.priority ?? "");
    setDetailBu(item.bu ?? "");
    setDetailOwner(item.owner ?? "");
    setDetailTimeline(item.timeline ?? "");
    setDetailsDialogOpen(true);
  };

  const saveRoadmapItemDetails = async () => {
    if (!activeSession || !selectedRoadmapItem) return;

    const updated = {
      name: detailName.trim(),
      description: detailDescription?.trim() || null,
      icon: detailIcon?.trim() || null,
      priority: detailPriority?.trim() || null,
      bu: detailBu?.trim() || null,
      owner: detailOwner?.trim() || null,
      timeline: detailTimeline?.trim() || null,
    };

    // Update project metadata
    await fetch(`/api/projects/${selectedRoadmapItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    // Update final placement status (if session is locked)
    if (!activeSession.active) {
      const horizon = selectedRoadmapItem.horizon;
      const status = detailStatus || null;
      await fetch(`/api/final/${activeSession.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placements: [{ projectId: selectedRoadmapItem.id, horizon, status }],
        }),
      });

      setRoadmapData((prev) =>
        (prev as RoadmapResult[]).map((r) =>
          r.id === selectedRoadmapItem.id
            ? { ...r, status, horizon, ...updated }
            : r
        )
      );
    } else {
      setRoadmapData((prev) =>
        (prev as RoadmapResult[]).map((r) =>
          r.id === selectedRoadmapItem.id ? { ...r, ...updated } : r
        )
      );
    }

    // Also update Projects list if present
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selectedRoadmapItem.id ? { ...p, ...updated, name: detailName.trim(), description: detailDescription?.trim() || null } : p
      )
    );

    toast.success("Item details saved");
    setDetailsDialogOpen(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleExportJSON = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeSession.name.replace(/\s+/g, "_")}_roadmap.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Roadmap exported successfully");
    } catch {
      toast.error("Failed to export roadmap");
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.items || !Array.isArray(json.items)) throw new Error("Invalid JSON");

          const items = json.items;
          const chunkSize = 10;
          const totalChunks = Math.ceil(items.length / chunkSize);
          let currentSessionId = activeSession?.id;

          const summary = {
            added: 0,
            updated: 0,
            placements: 0
          };

          for (let i = 0; i < totalChunks; i++) {
            const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
            toast.info(`Importing batch ${i + 1} of ${totalChunks}...`);

            const res = await fetch("/api/sessions/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: chunk,
                sessionId: currentSessionId,
                sessionName: json.sessionName || file.name.replace(".json", ""),
              }),
            });

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || `Batch ${i + 1} failed`);
            }
            
            const result = await res.json();
            currentSessionId = result.sessionId;
            summary.added += result.summary.projectsAdded;
            summary.updated += result.summary.projectsUpdated;
            summary.placements += result.summary.placementsUpdated;

            // Trigger partial refresh to "show updates"
            await loadSessions();
            if (currentSessionId) {
              await loadProjects(currentSessionId);
              await loadRoadmap(currentSessionId, yAxisEnabled);
            }
          }

          toast.success(
            `Import complete: Added ${summary.added}, Updated ${summary.updated} projects, Sync'd ${summary.placements} placements.`
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Invalid JSON format or import error";
          toast.error(message);
        }
      };
      reader.readAsText(file);
    } catch {
      toast.error("Failed to read file");
    } finally {
      e.target.value = "";
    }
  };

  const handleDeleteSession = async () => {
    if (!activeSession) return;
    if (!confirm(`Are you sure you want to delete the entire session "${activeSession.name}" and all associated data? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/sessions/${activeSession.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Session deleted successfully");
      setActiveSession(null);
      await loadSessions();
    } catch {
      toast.error("Failed to delete session");
    }
  };

  // Table view helpers
  const getPlacementForCell = (projectId: string, groupId: string) => {
    return placements.find(
      (p) => p.projectId === projectId && p.groupId === groupId
    );
  };

  const formatPlacement = (p: Placement | undefined) => {
    if (!p || p.horizon === null) return "—";
    if (!yAxisEnabled || !p.status) return `H${(p.horizon ?? 0) + 1}`;
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
          <h1 className="text-4xl font-extrabold text-blue-500 tracking-tight">Workshop Roadmap</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 font-bold">Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
              value={activeSession?.id || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "NEW_SESSION") {
                  setIsNewSessionDialogOpen(true);
                } else {
                  const s = sessions.find((s) => s.id === val);
                  setActiveSession(s || null);
                }
              }}
            >
              <option value="" disabled>Select Session...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-background text-foreground">
                  {s.name} {s.active ? "🟢" : "🔴"}
                </option>
              ))}
              <option value="NEW_SESSION" className="bg-background text-foreground font-bold text-blue-500">
                + Add New Session
              </option>
            </select>
            {activeSession && (
              <Button 
                variant="destructive" 
                size="icon-sm" 
                onClick={handleDeleteSession}
                className="bg-red-900/40 border-red-900/60 hover:bg-red-800 text-red-200"
                title="Delete Session"
              >
                <Trash2 className="size-4" />
              </Button>
            )}

            <Dialog open={isNewSessionDialogOpen} onOpenChange={setIsNewSessionDialogOpen}>
              <DialogContent className="glass border-border shadow-2xl backdrop-blur-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Enter a name for the new session.
                  </p>
                  <Input
                    placeholder="Session name (e.g., Season III Workshop)"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createSession()}
                    autoFocus
                  />
                  <Button className="w-full" onClick={createSession}>
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJSON}
              />
              <div className="flex h-8 items-center gap-2 px-3 rounded-md border border-border bg-card text-foreground text-sm font-bold hover:bg-accent transition-colors cursor-pointer">
                Import JSON
              </div>
            </label>
            <Button variant="outline" size="sm" onClick={handleExportJSON} className="bg-card border-border text-foreground font-bold hover:bg-accent">
              Export JSON
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} className="bg-card border-border text-foreground font-bold hover:bg-accent">
              Logout
            </Button>
          </div>
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
        <Tabs defaultValue="projects" className="flex flex-col lg:flex-row gap-8 relative">
          <TabsList className={`flex lg:flex-col h-auto bg-muted/50 p-1.5 gap-2 border border-border/50 rounded-xl transition-all duration-300 ease-in-out shrink-0 overflow-x-auto lg:overflow-visible ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
            <div className="hidden lg:flex justify-end mb-2 px-2 pt-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </Button>
            </div>
            
            <TabsTrigger 
              value="projects" 
              className={`w-full justify-start gap-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-muted-foreground hover:text-foreground rounded-lg px-4 py-3 transition-all font-bold group ${sidebarCollapsed ? 'px-2' : ''}`}
              title={sidebarCollapsed ? "Projects" : ""}
            >
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30 group-data-[state=active]:bg-white shrink-0"></div>
              {!sidebarCollapsed && <span>Projects</span>}
              {sidebarCollapsed && <span className="lg:hidden">Projects</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="groups" 
              className={`w-full justify-start gap-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-muted-foreground hover:text-foreground rounded-lg px-4 py-3 transition-all font-bold group border border-transparent data-[state=active]:border-blue-400/50 shadow-lg ${sidebarCollapsed ? 'px-2' : ''}`}
              title={sidebarCollapsed ? "Groups & Links" : ""}
            >
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30 group-data-[state=active]:bg-white shrink-0"></div>
              {!sidebarCollapsed && <span>Groups & Links</span>}
              {sidebarCollapsed && <span className="lg:hidden">Groups & Links</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="table" 
              className={`w-full justify-start gap-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-muted-foreground hover:text-foreground rounded-lg px-4 py-3 transition-all font-bold group ${sidebarCollapsed ? 'px-2' : ''}`}
              title={sidebarCollapsed ? "Table View" : ""}
            >
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30 group-data-[state=active]:bg-white shrink-0"></div>
              {!sidebarCollapsed && <span>Table View</span>}
              {sidebarCollapsed && <span className="lg:hidden">Table View</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="roadmap" 
              className={`w-full justify-start gap-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-muted-foreground hover:text-foreground rounded-lg px-4 py-3 transition-all font-bold group ${sidebarCollapsed ? 'px-2' : ''}`}
              title={sidebarCollapsed ? "Roadmap View" : ""}
            >
              <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 group-data-[state=active]:bg-white shrink-0"></div>
              {!sidebarCollapsed && <span>Roadmap View</span>}
              {sidebarCollapsed && <span className="lg:hidden">Roadmap View</span>}
            </TabsTrigger>
            {!sidebarCollapsed && (
              <div className="mt-auto hidden lg:block p-4">
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-widest font-bold mb-1">Session Data</p>
                  <p className="text-xs text-muted-foreground">{projects.length} Projects</p>
                  <p className="text-xs text-muted-foreground">{groups.length} Groups</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="mt-auto hidden lg:flex flex-col items-center gap-4 py-4">
                <div className="text-blue-400" title={`${projects.length} Projects, ${groups.length} Groups`}>
                   <LayoutGrid size={20} />
                </div>
              </div>
            )}
          </TabsList>

          <div className="flex-1 min-w-0">
            {/* Tab content follows... */}

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

            <div className="grid gap-3">
              {projects.map((p) => (
                <Card key={p.id} className="bg-card border-border overflow-hidden shadow-md">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="space-y-1">
                      <div className="font-bold text-foreground text-lg">{p.name}</div>
                      {p.description && (
                         <div className="text-sm text-muted-foreground font-medium line-clamp-2 max-w-2xl">{p.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
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
          <TabsContent value="groups" className="space-y-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Group name (e.g., BU TCD)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="max-w-sm"
                  onKeyDown={(e) => e.key === "Enter" && createGroup()}
                />
                <Button onClick={createGroup}>
                  <Plus className="mr-2 h-4 w-4" /> Add Group
                </Button>

                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                  <DialogTrigger 
                    render={
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Bulk Add
                      </Button>
                    }
                  />
                  <DialogContent className="glass border-border shadow-2xl backdrop-blur-2xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Create Groups</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Enter group names, one per line.
                      </p>
                      <Textarea
                        placeholder="Group 1: Marketing&#10;Group 2: Sales&#10;Group 3: Product"
                        value={bulkGroupsText}
                        onChange={(e) => setBulkGroupsText(e.target.value)}
                        rows={8}
                      />
                      <Button className="w-full" onClick={handleBulkCreateGroups}>
                        Generate {bulkGroupsText.split("\n").filter(n => n.trim()).length} Groups
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={copyAllLinks}>
                  <ClipboardCopy className="mr-2 h-4 w-4" /> Copy All Links
                </Button>
                <Button
                  variant={activeSession.active ? "destructive" : "default"}
                  onClick={toggleSessionActive}
                  className="min-w-[180px]"
                >
                  {activeSession.active ? (
                    <><Lock className="mr-2 h-4 w-4" /> Finalize Session</>
                  ) : (
                    <><Unlock className="mr-2 h-4 w-4" /> Resume Session</>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groups.map((g) => (
                <Card key={g.id} className="overflow-hidden border-border bg-card/50 hover:bg-card transition-all duration-200 shadow-lg group">
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-bold text-foreground text-lg group-hover:text-blue-500 transition-colors">{g.name}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                        onClick={() => deleteGroup(g.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 rounded-lg bg-background p-3 border border-border group-hover:border-blue-500/30 transition-colors">
                        <code className="flex-1 truncate text-xs text-blue-600 dark:text-blue-400 font-mono">
                          {getGroupLink(g.token)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                          onClick={() => {
                            copyLink(g.token);
                          }}
                          title="Copy Link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Status</span>
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${activeSession.active ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"}`}>
                            <span className={`h-2 w-2 rounded-full ${activeSession.active ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></span>
                            {activeSession.active ? "Active" : "Locked"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Placements</span>
                          <span className="text-xs font-bold text-foreground">
                            {g._count?.placements || 0} Projects
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {groups.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Plus className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No groups yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Create groups to generate unique session links for your workshop participants.
                  </p>
                </div>
              )}
            </div>

            {!activeSession.active && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                ⚠️ Session is currently Locked. Group leaders can no longer make changes.
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border-r border-border pr-3 mr-1">
                  <label className="text-muted-foreground text-sm cursor-pointer whitespace-nowrap">Y-Axis:</label>
                  <input
                    type="checkbox"
                    checked={yAxisEnabled}
                    onChange={(e) => setYAxisEnabled(e.target.checked)}
                    className="rounded cursor-pointer"
                    title="Enable Y-axis (Status) grouping"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => activeSession && loadPlacements(activeSession.id)}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <Table className="premium-table">
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
                            {yAxisEnabled && status && STATUS_COLORS[status] ? (
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
                            ) : status && !yAxisEnabled && (placement?.horizon !== null) ? (
                              <Badge variant="outline" className="text-xs">
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
                <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
                  <label className="text-muted-foreground text-sm cursor-pointer whitespace-nowrap">Fit View:</label>
                  <input
                    type="checkbox"
                    checked={compactRoadmap}
                    onChange={(e) => {
                      setCompactRoadmap(e.target.checked);
                      setSidebarCollapsed(e.target.checked);
                    }}
                    className="rounded cursor-pointer"
                    title="Collapse sidebar and use compact grid"
                  />
                </div>
                <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
                  <label className="text-muted-foreground text-sm cursor-pointer whitespace-nowrap">Y-Axis:</label>
                  <input
                    type="checkbox"
                    checked={yAxisEnabled}
                    onChange={(e) => setYAxisEnabled(e.target.checked)}
                    className="rounded cursor-pointer"
                    title="Enable Y-axis (Status) grouping"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => activeSession && loadRoadmap(activeSession.id, yAxisEnabled)}>
                  Refresh Now
                </Button>
              </div>
            </div>

            <RoadmapGrid
              projects={(roadmapData as RoadmapResult[])
                .filter((r) => r.horizon !== null && (!yAxisEnabled || r.status !== null))
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  description: r.description,
                  icon: r.icon,
                  priority: r.priority,
                  bu: r.bu,
                  owner: r.owner,
                  timeline: r.timeline,
                  status: r.status,
                  horizon: r.horizon,
                  agreedGroups: r.agreedGroups,
                  isPlaced: true,
                }))}
              inboxProjects={(roadmapData as RoadmapResult[])
                .filter((r) => r.horizon === null || (yAxisEnabled && r.status === null))
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  description: r.description,
                  icon: r.icon,
                  priority: r.priority,
                  bu: r.bu,
                  owner: r.owner,
                  timeline: r.timeline,
                  agreedGroups: r.agreedGroups,
                  isPlaced: false,
                }))}
              onDragEnd={handleFinalDragEnd}
              onCardClick={activeSession && !activeSession.active ? openRoadmapItemDetails : undefined}
              readOnly={activeSession.active}
              showGroupBadges={true}
              compact={compactRoadmap}
              yAxisEnabled={yAxisEnabled}
            />
          </TabsContent>
          </div>
        </Tabs>
      )}

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="glass border-border shadow-2xl backdrop-blur-2xl">
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

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="glass border-border shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Edit Item Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={detailName}
                onChange={(e) => setDetailName(e.target.value)}
                placeholder="Project title"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (Font Awesome class)</Label>
              <Input
                value={detailIcon || ""}
                onChange={(e) => setDetailIcon(e.target.value)}
                placeholder="e.g., fa-solid fa-rocket"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={detailDescription || ""}
                onChange={(e) => setDetailDescription(e.target.value)}
                placeholder="Project description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={detailStatus || ""}
                  onChange={(e) => setDetailStatus(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="">(none)</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority / Stage</Label>
                <select
                  value={detailPriority || ""}
                  onChange={(e) => setDetailPriority(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="">(none)</option>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>BU</Label>
                <Input
                  value={detailBu || ""}
                  onChange={(e) => setDetailBu(e.target.value)}
                  placeholder="e.g., ADL"
                />
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input
                  value={detailOwner || ""}
                  onChange={(e) => setDetailOwner(e.target.value)}
                  placeholder="Owner name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Timeline</Label>
                <Input
                  value={detailTimeline || ""}
                  onChange={(e) => setDetailTimeline(e.target.value)}
                  placeholder="e.g., Q1-Q2 2026"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRoadmapItemDetails} disabled={!selectedRoadmapItem}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
