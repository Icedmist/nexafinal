import { useState, useEffect } from "react";
import { 
  Building2, 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink,
  ShieldCheck,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Business {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  businessType: string;
  status: "active" | "suspended" | "pending";
  createdAt: any;
  branchCount?: number;
}

export default function SystemBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, [statusFilter]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, "stores"), orderBy("name"));
      
      if (statusFilter !== "all") {
        q = query(collection(db, "stores"), where("status", "==", statusFilter), orderBy("name"));
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Business[];
      
      setBusinesses(data);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Failed to load businesses.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (business: Business) => {
    const newStatus = business.status === "active" ? "suspended" : "active";
    try {
      await updateDoc(doc(db, "stores", business.id), {
        status: newStatus
      });
      toast.success(`Business ${newStatus} successfully.`);
      fetchBusinesses();
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Business Registry</h1>
          <p className="text-slate-400">Manage all organizations on the platform.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-400 transition-all hover:text-white">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white uppercase tracking-widest transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20">
            Provision New
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search by name or slug..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/50 p-1">
            {["all", "active", "suspended"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold capitalize transition-all",
                  statusFilter === filter 
                    ? "bg-slate-800 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          
          <button className="flex items-center justify-center h-11 w-11 rounded-2xl border border-slate-800 bg-slate-950/50 text-slate-500 hover:text-white transition-all">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl shadow-black/50">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
            <span className="text-sm font-medium text-slate-500">Scanning registry...</span>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
            <Building2 className="h-12 w-12 text-slate-800" />
            <div className="flex flex-col gap-1">
               <span className="text-lg font-bold text-white">No businesses found</span>
               <span className="text-sm text-slate-500">Try adjusting your filters or search query.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Entity Details</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Infrastructure</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Creation Date</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredBusinesses.map((biz) => (
                  <tr 
                    key={biz.id} 
                    onClick={() => {
                      setSelectedBusiness(biz);
                      setDetailsOpen(true);
                    }}
                    className="group hover:bg-blue-600/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-blue-500/50 transition-colors">
                          <Building2 className="h-6 w-6 text-slate-600 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-base leading-tight">{biz.name || "Unnamed Store"}</span>
                          <span className="text-[11px] text-blue-500 font-bold uppercase tracking-widest mt-1">{biz.slug}.nexa.os</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ring-1",
                        biz.status === "active" 
                          ? "bg-emerald-500/5 text-emerald-500 ring-emerald-500/20" 
                          : "bg-rose-500/5 text-rose-500 ring-rose-500/20"
                      )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", biz.status === "active" ? "bg-emerald-500" : "bg-rose-500")} />
                        {biz.status || "active"}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-300">{(biz.branchCount || 1)} Branches</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{biz.businessType || "Retail"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-xs font-bold text-slate-500 tracking-tight">
                         {biz.createdAt?.seconds ? new Date(biz.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(biz);
                          }}
                          title={biz.status === "active" ? "Suspend Business" : "Activate Business"}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all"
                        >
                          {biz.status === "active" ? <Ban className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const host = window.location.hostname;
                            const protocol = window.location.protocol;
                            const port = window.location.port;
                            const slug = biz.slug;
                            
                            let targetUrl = "";
                            if (host.includes("localhost") || host.includes("127.0.0.1")) {
                              targetUrl = `${protocol}//${slug}.localhost${port ? `:${port}` : ""}/app/dashboard`;
                            } else {
                              const parts = host.split(".");
                              const domain = parts.slice(-2).join(".");
                              targetUrl = `${protocol}//${slug}.${domain}/app/dashboard`;
                            }
                            window.open(targetUrl, "_blank");
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                          title="View Operations (Audit Mode)"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBusiness(biz);
                            setDetailsOpen(true);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-100 transition-all"
                          title="Entity Settings"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination (Simplified Mock) */}
        <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950/50 px-8 py-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Showing {filteredBusinesses.length} Organizations</span>
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-600 hover:text-white disabled:opacity-30" disabled>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-xs">1</div>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-600 hover:text-white disabled:opacity-30" disabled>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Business Details Dialog Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl bg-slate-950/95 border-slate-800 text-white rounded-[2.5rem] p-8 nexa-glass shadow-2xl animate-in fade-in duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-500" />
              Store Operations Details
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Detailed system profile and infrastructure metrics for {selectedBusiness?.name}.
            </DialogDescription>
          </DialogHeader>

          {selectedBusiness && (
            <div className="space-y-6 mt-4">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Store Name</span>
                  <span className="text-base font-bold text-white mt-1 block">{selectedBusiness.name || "Unnamed"}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Slug / Domain Prefix</span>
                  <span className="text-base font-bold text-blue-400 mt-1 block">{selectedBusiness.slug || "None"}.nexa.os</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Owner UID</span>
                  <span className="text-xs font-mono text-slate-300 mt-1 block truncate" title={selectedBusiness.ownerId}>{selectedBusiness.ownerId}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Created Date</span>
                  <span className="text-base font-bold text-slate-300 mt-1 block">
                    {selectedBusiness.createdAt?.seconds ? new Date(selectedBusiness.createdAt.seconds * 1000).toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>

              {/* Infrastructure Details */}
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Infrastructure Details</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-lg font-bold text-white block">{selectedBusiness.branchCount || 1}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Branches</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-lg font-bold text-white block capitalize">{selectedBusiness.businessType || "Retail"}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-lg font-bold text-emerald-500 block capitalize">{selectedBusiness.status || "active"}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  </div>
                </div>
              </div>

              {/* Quick Controls */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-900">
                <Button 
                  variant="outline" 
                  className="rounded-xl border-slate-800 text-slate-400 hover:text-white"
                  onClick={() => setDetailsOpen(false)}
                >
                  Close Profile
                </Button>
                <Button 
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest text-xs h-10 px-5 text-white"
                  onClick={() => {
                    const host = window.location.hostname;
                    const protocol = window.location.protocol;
                    const port = window.location.port;
                    const slug = selectedBusiness.slug;
                    
                    let targetUrl = "";
                    if (host.includes("localhost") || host.includes("127.0.0.1")) {
                      targetUrl = `${protocol}//${slug}.localhost${port ? `:${port}` : ""}/app/dashboard`;
                    } else {
                      const parts = host.split(".");
                      const domain = parts.slice(-2).join(".");
                      targetUrl = `${protocol}//${slug}.${domain}/app/dashboard`;
                    }
                    window.open(targetUrl, "_blank");
                  }}
                >
                  Jump Into Operations
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
