import React, { useMemo } from "react";
import { Store, Trophy, Sparkles, TrendingUp, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface StoreBranchInfo {
  id: string;
  name: string;
  salesTotal?: number;
  salesCount?: number;
  country?: string;
  state?: string;
}

interface BranchLeaderboardCardProps {
  branches: StoreBranchInfo[];
  currencySymbol?: string;
}

export function BranchLeaderboardCard({ branches, currencySymbol = "₦" }: BranchLeaderboardCardProps) {
  // Only display if merchant has >1 branch!
  if (!branches || branches.length <= 1) {
    return null;
  }

  // Find top branch safely
  const sorted = [...branches].sort((a, b) => (b.salesTotal ?? 0) - (a.salesTotal ?? 0));
  const topBranch = sorted[0];

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Trophy className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground leading-tight flex items-center gap-1.5">
              <span>Inter-Branch Momentum</span>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 px-1.5 py-0">
                {branches.length} Registered Locations
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">Friendly performance highlight across your company branches.</p>
          </div>
        </div>
      </div>

      {topBranch && (
        <div className="p-3 rounded-lg border border-border bg-card/90 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-extrabold text-xs">
              🌟
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-foreground truncate">
                {topBranch.name} led branch momentum
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Recorded {currencySymbol}{(topBranch.salesTotal ?? 0).toLocaleString()} in total volume
              </p>
            </div>
          </div>

          <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-[10px] font-bold border-none px-2 py-0.5 shrink-0">
            Top Pace
          </Badge>
        </div>
      )}

      {/* Friendly listing of all branches without negative ranking labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
        {sorted.map((b, idx) => (
          <div key={b.id} className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate">{b.name}</span>
            </div>
            <span className="font-mono font-semibold text-muted-foreground text-[11px] shrink-0">
              {currencySymbol}{(b.salesTotal ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
