// Majority-rule algorithm for computing consolidated roadmap placements

export interface PlacementInput {
  projectId: string;
  groupId: string;
  horizon: number | null;
  status: string | null;
}

export interface MajorityResult {
  projectId: string;
  horizon: number | null;
  status: string | null;
  groups: string[];      // group IDs that voted for this position
  totalGroups: number;
  isPlaced: boolean;     // true if majority reached
}

export function computeMajority(
  placements: PlacementInput[],
  totalGroupCount: number
): MajorityResult[] {
  // Group placements by project
  const byProject = new Map<string, PlacementInput[]>();
  for (const p of placements) {
    if (!byProject.has(p.projectId)) byProject.set(p.projectId, []);
    byProject.get(p.projectId)!.push(p);
  }

  const results: MajorityResult[] = [];

  for (const [projectId, projectPlacements] of byProject) {
    // Count votes for each (status, horizon) cell
    const cellVotes = new Map<string, string[]>(); // "STATUS|HORIZON" -> groupIds

    for (const p of projectPlacements) {
      if (p.status === null || p.horizon === null) continue; // skip inbox items
      const key = `${p.status}|${p.horizon}`;
      if (!cellVotes.has(key)) cellVotes.set(key, []);
      cellVotes.get(key)!.push(p.groupId);
    }

    // Find the cell with the most votes
    let bestKey = "";
    let bestGroups: string[] = [];
    for (const [key, groups] of cellVotes) {
      if (groups.length > bestGroups.length) {
        bestKey = key;
        bestGroups = groups;
      }
    }

    // Check majority (>50% of total groups)
    const hasMajority = bestGroups.length > totalGroupCount / 2;

    if (hasMajority && bestKey) {
      const [status, horizonStr] = bestKey.split("|");
      results.push({
        projectId,
        horizon: parseInt(horizonStr),
        status,
        groups: bestGroups,
        totalGroups: totalGroupCount,
        isPlaced: true,
      });
    } else {
      // Collect all groups that placed this project anywhere
      const allGroups = projectPlacements
        .filter((p) => p.status !== null && p.horizon !== null)
        .map((p) => p.groupId);
      results.push({
        projectId,
        horizon: null,
        status: null,
        groups: [...new Set(allGroups)],
        totalGroups: totalGroupCount,
        isPlaced: false,
      });
    }
  }

  return results;
}
