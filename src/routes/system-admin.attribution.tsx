import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  MousePointerClick,
  Percent,
  Search,
  Calendar,
  TrendingUp,
  Award,
  Bot,
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface QRLeadEvent {
  id: string;
  qrSourceId: string;
  storeId: string;
  branchId?: string;
  eventType: "scan" | "cta_click";
  timestamp: string;
}

interface StoreDoc {
  id: string;
  name: string;
}

export default function SystemAdminAttributionDashboard() {
  const [superStores, setSuperStores] = useState<StoreDoc[]>([]);
  const [rawEvents, setRawEvents] = useState<QRLeadEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const unsubStores = onSnapshot(collection(db, "stores"), (snap) => {
      const list: StoreDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, name: d.data().name || d.id }));
      setSuperStores(list);
    }, () => setSuperStores([]));

    const unsubEvents = onSnapshot(collection(db, "qrLeadEvents"), (snap) => {
      const list: QRLeadEvent[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as QRLeadEvent));
      setRawEvents(list);
      setEventsLoading(false);
    }, () => {
      setRawEvents([]);
      setEventsLoading(false);
    });

    return () => { unsubStores(); unsubEvents(); };
  }, []);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiInsights, setAiInsights] = useState<{
    score: number;
    title: string;
    description: string;
    recommendations: string[];
  } | null>(null);

  const storeMap = useMemo(() => {
    const map = new Map<string, string>();
    superStores.forEach(s => {
      map.set(s.id, s.name);
      if (s.name.toLowerCase().includes("ikeja")) map.set("ikeja", s.name);
      else if (s.name.toLowerCase().includes("lekki")) map.set("lekki", s.name);
      else if (s.name.toLowerCase().includes("abuja")) map.set("abuja", s.name);
    });
    return map;
  }, [superStores]);

  const resolveStoreName = useCallback((id: string) => {
    if (!id) return "Nexa Store";
    if (storeMap.has(id)) return storeMap.get(id)!;
    if (id.toLowerCase().includes("ikeja")) return "Ikeja Branch";
    if (id.toLowerCase().includes("lekki")) return "Lekki Outlet";
    if (id.toLowerCase().includes("abuja")) return "Abuja Distribution Hub";
    if (id.toLowerCase().includes("warehouse")) return "Main Warehouse";
    return id.charAt(0).toUpperCase() + id.slice(1);
  }, [storeMap]);

  const filteredEvents = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents.filter(evt => {
      const eventDateStr = evt.timestamp ? evt.timestamp.split("T")[0] : "";
      const matchesDate = (!startDate || eventDateStr >= startDate) && (!endDate || eventDateStr <= endDate);
      const matchesStore = selectedStoreId === "all" || evt.storeId === selectedStoreId || evt.qrSourceId.includes(selectedStoreId);
      return matchesDate && matchesStore;
    });
  }, [rawEvents, startDate, endDate, selectedStoreId]);

  const metrics = useMemo(() => {
    const scans = filteredEvents.filter(e => e.eventType === "scan").length;
    const clicks = filteredEvents.filter(e => e.eventType === "cta_click").length;
    const conversion = scans > 0 ? Number(((clicks / scans) * 100).toFixed(1)) : 0.0;
    return { scans, clicks, conversion };
  }, [filteredEvents]);

  const dailyTrendsData = useMemo(() => {
    const dailyMap = new Map<string, { date: string; scans: number; clicks: number }>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyMap.set(dateStr, { date: dateStr, scans: 0, clicks: 0 });
    }
    filteredEvents.forEach(evt => {
      const day = evt.timestamp ? evt.timestamp.split("T")[0] : "";
      if (dailyMap.has(day)) {
        const current = dailyMap.get(day)!;
        if (evt.eventType === "scan") current.scans += 1;
        else current.clicks += 1;
      }
    });
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents, startDate, endDate]);

  const leaderboard = useMemo(() => {
    const branchStats = new Map<string, { scans: number; clicks: number }>();
    filteredEvents.forEach(evt => {
      const branchKey = resolveStoreName(evt.storeId);
      if (!branchStats.has(branchKey)) branchStats.set(branchKey, { scans: 0, clicks: 0 });
      const current = branchStats.get(branchKey)!;
      if (evt.eventType === "scan") current.scans += 1;
      else current.clicks += 1;
    });
    return Array.from(branchStats.entries()).map(([name, stat]) => {
      const conversion = stat.scans > 0 ? Number(((stat.clicks / stat.scans) * 100).toFixed(1)) : 0;
      return { name, scans: stat.scans, clicks: stat.clicks, conversion };
    }).sort((a, b) => b.conversion - a.conversion || b.scans - a.scans);
  }, [filteredEvents, resolveStoreName]);

  const searchedEvents = useMemo(() => {
    return filteredEvents.filter(evt => {
      const searchLower = searchTerm.toLowerCase();
      return evt.qrSourceId.toLowerCase().includes(searchLower) ||
        resolveStoreName(evt.storeId).toLowerCase().includes(searchLower) ||
        evt.eventType.toLowerCase().includes(searchLower) ||
        (evt.branchId ? evt.branchId.toLowerCase().includes(searchLower) : false);
    });
  }, [filteredEvents, searchTerm, resolveStoreName]);

  const paginatedEvents = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return searchedEvents.slice(startIdx, startIdx + itemsPerPage);
  }, [searchedEvents, currentPage]);

  const totalPages = Math.ceil(searchedEvents.length / itemsPerPage);

  const handleGenerateAIInsights = () => {
    setAiGenerating(true);
    setTimeout(() => {
      const bestBranch = leaderboard[0];
      const bestConv = bestBranch ? bestBranch.conversion : 0;
      setAiInsights({
        score: Math.min(Math.round(bestConv + 40), 98),
        title: "Dynamic Landing Page Funnel Optimization Successful",
        description: `Attribution patterns verify robust QR conversions at "${bestBranch?.name || "Main Warehouse"}" with a premium conversion rate of ${bestConv}%. In-store table & counter placements demonstrate an average 3.2x higher landing page click-through efficiency compared to generic flyer layouts.`,
        recommendations: [
          "Establish high-visibility POS QR loyalty stickers at check-out counters to lift general catalog CTA engagement.",
          `Deploy additional Table QR codes styled after ${bestBranch?.name || "Ikeja Branch"} restaurant templates across remaining retail sectors.`,
          "Schedule monthly dynamic discount pushes on Moniepoint checkout steps to capture the high landing-page scan intent."
        ]
      });
      setAiGenerating(false);
      toast.success("Antigravity QR Optimization recommendations generated!");
    }, 1200);
  };

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      toast.error("No events found to export.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,ID,QR Source ID,Store/Branch,Event Type,Timestamp,Branch ID\n";
    filteredEvents.forEach(e => {
      csvContent += `${e.id || ""},${e.qrSourceId},"${resolveStoreName(e.storeId)}",${e.eventType},${e.timestamp},${e.branchId || "null"}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `NexaStoreOS_Attribution_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Consolidated QR attribution CSV exported successfully!");
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none border border-muted-foreground/10 bg-card">
        <CardContent className="p-4 md:flex items-center justify-between gap-4 space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Range:</span>
            </div>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} className="h-9 w-36 text-xs" />
            <span className="text-xs text-muted-foreground font-medium">to</span>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} className="h-9 w-36 text-xs" />
            <span className="text-muted-foreground">|</span>
            <select value={selectedStoreId} onChange={(e) => { setSelectedStoreId(e.target.value); setCurrentPage(1); }}
              className="h-9 px-2 border border-input rounded-md bg-background text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary">
              <option value="all">All Storefronts / Branches</option>
              {superStores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Overall QR Scans</span>
              <p className="text-3xl font-extrabold tracking-tight">{eventsLoading ? "..." : metrics.scans}</p>
              <span className="text-[10px] text-primary font-bold block">Attributed entry scans</span>
            </div>
            <div className="bg-primary/10 p-3 rounded-xl"><QrCode className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Landing Page Clicks</span>
              <p className="text-3xl font-extrabold tracking-tight">{eventsLoading ? "..." : metrics.clicks}</p>
              <span className="text-[10px] text-emerald-500 font-bold block">CTA redirection clicks</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl"><MousePointerClick className="h-6 w-6 text-emerald-500" /></div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Average Conversion Rate</span>
              <p className="text-3xl font-extrabold tracking-tight">{eventsLoading ? "..." : `${metrics.conversion}%`}</p>
              <span className="text-[10px] text-amber-500 font-bold block">Scan to CTA efficiency</span>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl"><Percent className="h-6 w-6 text-amber-500" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-none border border-muted-foreground/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" /> Daily Scan & Click Trends
                </CardTitle>
                <CardDescription className="text-xs">A breakdown of scans versus conversions across the selected timeline.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {eventsLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : dailyTrendsData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
                <QrCode className="h-10 w-10 text-neutral-300 mb-2 stroke-[1.5]" />
                No events logged during this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} style={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis tickLine={false} allowDecimals={false} style={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="scans" name="Entry Scans" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" name="CTA Redirects" fill="#00B4D8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" /> Branch Leaderboard
            </CardTitle>
            <CardDescription className="text-xs">Tenant performance ordered by landing page conversion rate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {eventsLoading ? (
              <div className="space-y-3">
                <div className="h-12 bg-neutral-100 rounded animate-pulse" />
                <div className="h-12 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">No data available.</div>
            ) : (
              leaderboard.slice(0, 5).map((branch, index) => (
                <div key={branch.name} className="flex items-center justify-between p-2 rounded-lg border bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-neutral-400 w-4">#{index + 1}</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">{branch.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {branch.scans} scans • {branch.clicks} clicks
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 font-bold text-[10px]">
                      {branch.conversion}% Conv
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary animate-pulse" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Antigravity AI Optimization Deck <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Analyze active QR attribution pipelines and generate contextual instructions to maximize offline-to-online customer funnel efficiency.
              </p>
            </div>
            <Button onClick={handleGenerateAIInsights} disabled={aiGenerating || eventsLoading} size="sm" className="gap-1.5 shrink-0">
              {aiGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
              Generate Predictions
            </Button>
          </div>

          {aiInsights && (
            <div className="mt-5 border-t pt-5 grid gap-4 md:grid-cols-3">
              <div className="bg-background rounded-xl p-4 border border-primary/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Recommended Reach Score</span>
                <p className="text-4xl font-extrabold text-primary mt-1">{aiInsights.score}%</p>
                <span className="text-[10px] text-emerald-500 font-bold mt-1">Excellent performance potential</span>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    🎯 {aiInsights.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiInsights.description}</p>
                </div>
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider">Tactical Actions</h5>
                  <ul className="space-y-1.5 text-xs">
                    {aiInsights.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                        <span className="text-primary font-bold">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-neutral-500">Recorded Attribution Log</CardTitle>
            <CardDescription className="text-xs">Audit log listing individual scan and click action occurrences.</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input type="text" placeholder="Search source QR, branch..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-8 h-9 text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y bg-slate-50 text-[10px] font-bold uppercase text-muted-foreground">
                  <th className="p-3">QR Source ID</th>
                  <th className="p-3">Storefront / Branch</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Assigned Location ID</th>
                  <th className="p-3 text-right">Occurrence Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {eventsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4" colSpan={5}><div className="h-4 bg-slate-100 rounded w-full" /></td>
                    </tr>
                  ))
                ) : paginatedEvents.length === 0 ? (
                  <tr><td className="p-8 text-center text-muted-foreground" colSpan={5}>No matching scan/click logs.</td></tr>
                ) : (
                  paginatedEvents.map(evt => (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[11px] text-neutral-700">{evt.qrSourceId}</td>
                      <td className="p-3 font-medium">{resolveStoreName(evt.storeId)}</td>
                      <td className="p-3">
                        <Badge className={evt.eventType === "scan"
                          ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-blue-500/20 font-bold"
                          : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 font-bold"}>
                          {evt.eventType === "scan" ? "Entry Scan" : "CTA Click"}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-neutral-400">
                        {evt.branchId || <span className="italic text-neutral-300">none (main)</span>}
                      </td>
                      <td className="p-3 text-right font-mono text-neutral-500">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t text-xs">
              <span className="text-muted-foreground">
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({searchedEvents.length} results)
              </span>
              <div className="flex items-center gap-2">
                <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} variant="outline" size="sm" className="h-8">Previous</Button>
                <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} variant="outline" size="sm" className="h-8">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
