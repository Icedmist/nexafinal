import { useMemo } from "react";
import { useLocations as useRealLocations } from "@/hooks/useInventoryData";
import { useStoreBranches } from "@/hooks/useStaffData";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Location } from "@/types/inventory";

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
  depth: number;
}

function buildTree(locations: Location[]): LocationTreeNode[] {
  const map = new Map<string, LocationTreeNode>();
  const roots: LocationTreeNode[] = [];

  for (const loc of locations) {
    map.set(loc.id, { ...loc, children: [], depth: 0 });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      const parent = map.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Set depth recursively for deeper nesting
  function setDepth(nodes: LocationTreeNode[], depth: number) {
    for (const n of nodes) {
      n.depth = depth;
      setDepth(n.children, depth + 1);
    }
  }
  setDepth(roots, 0);

  return roots;
}

export function useLocations() {
  return useRealLocations();
}

export function useLocationTree() {
  const { data: locations } = useLocations();
  const { data: branches } = useStoreBranches();
  const { ownerId } = useBusiness();

  return useMemo(() => {
    // Treat branches as root locations
    const branchLocations: Location[] = branches.map(b => ({
      id: b.id,
      ownerId: ownerId || "",
      name: b.name,
      type: "warehouse",
      address: b.location,
      parentId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Merge only unique ones (avoid duplicates if already synced)
    const combined = [...locations];
    for (const bl of branchLocations) {
      if (!combined.find(l => l.id === bl.id || l.name === bl.name)) {
        combined.push(bl);
      }
    }

    return buildTree(combined);
  }, [locations, branches]);
}
