import React, { useMemo } from "react";
import { TrendingUp, Calendar, Zap, Sparkles, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface SaleForRecap {
  id: string;
  total?: number;
  amount?: number;
  createdAt?: string | Date;
  date?: string | Date;
}

interface WeeklyRecapHeadlineCardProps {
  sales: SaleForRecap[];
  currencySymbol?: string;
}

export function WeeklyRecapHeadlineCard({ sales, currencySymbol = "₦" }: WeeklyRecapHeadlineCardProps) {
  const recap = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        headline: "Ready for your weekly sales streak!",
        description: "Ring up sales this week to unlock real-time revenue insights and peak day performance trends.",
        badgeText: "Weekly Recap",
        isGrowth: false,
      };
    }

    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    const currentWeekSales: { dayName: string; total: number }[] = [
      { dayName: "Sunday", total: 0 },
      { dayName: "Monday", total: 0 },
      { dayName: "Tuesday", total: 0 },
      { dayName: "Wednesday", total: 0 },
      { dayName: "Thursday", total: 0 },
      { dayName: "Friday", total: 0 },
      { dayName: "Saturday", total: 0 },
    ];

    let currentWeekTotal = 0;
    let priorWeekTotal = 0;

    sales.forEach((s) => {
      const val = s.total ?? s.amount ?? 0;
      const saleDate = new Date(s.createdAt ?? s.date ?? now);
      const diffDays = (now.getTime() - saleDate.getTime()) / msInDay;

      if (diffDays <= 7) {
        currentWeekTotal += val;
        const dayIdx = saleDate.getDay();
        currentWeekSales[dayIdx].total += val;
      } else if (diffDays > 7 && diffDays <= 14) {
        priorWeekTotal += val;
      }
    });

    // Find peak day
    let peakDay = currentWeekSales[0];
    currentWeekSales.forEach((d) => {
      if (d.total > peakDay.total) {
        peakDay = d;
      }
    });

    // Calculate growth %
    let growthPct = 0;
    if (priorWeekTotal > 0) {
      growthPct = Math.round(((currentWeekTotal - priorWeekTotal) / priorWeekTotal) * 100);
    }

    if (growthPct > 0) {
      return {
        headline: `+${growthPct}% Revenue Growth This Week!`,
        description: `Your storefront generated ${currencySymbol}${currentWeekTotal.toLocaleString()} over the last 7 days vs ${currencySymbol}${priorWeekTotal.toLocaleString()} in the prior period.`,
        badgeText: "High Velocity",
        isGrowth: true,
      };
    } else if (peakDay.total > 0) {
      return {
        headline: `${peakDay.dayName} Was Your Peak Sales Day!`,
        description: `Your store achieved its highest daily momentum on ${peakDay.dayName} with ${currencySymbol}${peakDay.total.toLocaleString()} in completed sales.`,
        badgeText: "Peak Performance",
        isGrowth: true,
      };
    } else {
      return {
        headline: `Active Business Week: ${currencySymbol}${currentWeekTotal.toLocaleString()} Recorded`,
        description: "Consistent storefront activity recorded. Keep building your daily business streak!",
        badgeText: "Steady Momentum",
        isGrowth: false,
      };
    }
  }, [sales, currencySymbol]);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-2xs space-y-2 relative overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Weekly Business Performance Highlight
            </span>
            <h3 className="font-bold text-sm text-foreground leading-tight">{recap.headline}</h3>
          </div>
        </div>

        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px] font-bold border-none px-2 py-0.5 shrink-0">
          {recap.badgeText}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed pl-10">
        {recap.description}
      </p>
    </div>
  );
}
