export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMajority } from "@/lib/majority";
import type { Project, Group, Placement } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const [groups, placements, projects] = await Promise.all([
    prisma.group.findMany({ where: { sessionId } }),
    prisma.placement.findMany({
      where: { project: { sessionId } },
      include: { group: true },
    }),
    prisma.project.findMany({ where: { sessionId } }),
  ]);

  const majorityResults = computeMajority(
    placements.map((p: Placement) => ({
      projectId: p.projectId,
      groupId: p.groupId,
      horizon: p.horizon,
      status: p.status,
    })),
    groups.length
  );

  // Merge with project data and group names
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const groupMap = new Map(groups.map((g: Group) => [g.id, g]));

  // Find projects that have no placements at all
  const placedProjectIds = new Set(majorityResults.map((r) => r.projectId));
  const unplacedProjects = projects.filter((p: Project) => !placedProjectIds.has(p.id));

  const enriched = [
    ...majorityResults.map((r) => ({
      ...r,
      project: projectMap.get(r.projectId),
      groupNames: r.groups.map((gId: string) => groupMap.get(gId)?.name || gId),
    })),
    ...unplacedProjects.map((p: Project) => ({
      projectId: p.id,
      horizon: null,
      status: null,
      groups: [] as string[],
      groupNames: [] as string[],
      totalGroups: groups.length,
      isPlaced: false,
      project: p,
    })),
  ];

  return NextResponse.json({
    results: enriched,
    totalGroups: groups.length,
    totalProjects: projects.length,
  });
}
