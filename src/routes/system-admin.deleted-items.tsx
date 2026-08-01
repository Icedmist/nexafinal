import { useState, useEffect } from "react";
import {
  Activity,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DeletedItemLog {
  id: string;
  title: string;
  message: string;
  userEmail: string;
  userId: string;
  timestamp: any;
  storeId?: string;
  metadata?: {
    itemId?: string;
  };
  type?: string;
}

export default function SystemDeletedItems() {
  const [logs, setLogs] = useState<DeletedItemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLog, setSelectedLog] = useState<DeletedItemLog | null>(null);
  const [stores, setStores] = useState<Map<string, string>>(new Map());

  // Fetch all stores for filtering
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const snapshot = await getDocs(collection(db, "stores"));
        const storeMap = new Map<string, string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          storeMap.set(doc.id, data.name || data.storeDetails?.name || doc.id);
        });
        setStores(storeMap);
      } catch (error) {
        console.error("Error fetching stores:", error);
      }
    };
    fetchStores();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [storeFilter]);

  const fetchLogs = async (isMore = false) => {
    setLoading(true);
    try {
      let q;

      if (storeFilter !== "all") {
        q = query(
          collection(db, "activity_logs"),
          where("type", "==", "item_delete"),
          where("storeId", "==", storeFilter),
          orderBy("timestamp", "desc"),
          limit(30)
        );
      } else {
        q = query(
          collection(db, "activity_logs"),
          where("type", "==", "item_delete"),
          orderBy("timestamp", "desc"),
          limit(30)
        );
      }

      if (isMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DeletedItemLog[];

      if (isMore) {
        setLogs((prev) => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 30);
    } catch (error) {
      console.error("Error fetching deleted items logs:", error);
      toast.error("Failed to load deleted items logs.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.metadata?.itemId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    try {
      const csvContent = [
        ["Deleted Item", "Deleted By", "Email", "Store", "Date & Time", "Item ID"],
        ...filteredLogs.map((log) => [
          log.message.replace("A product was removed from the catalog.", ""),
          log.userEmail.split("@")[0],
          log.userEmail,
          stores.get(log.storeId || "") || log.storeId || "Unknown",
          log.timestamp?.toDate?.()?.toLocaleString?.("en-NG") ||
            new Date(log.timestamp).toLocaleString("en-NG"),
          log.metadata?.itemId || "N/A",
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deleted-items-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success(`Exported ${filteredLogs.length} deleted items`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString("en-NG", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }
      return new Date(timestamp).toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Deleted Items Audit Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track all products deleted across your platform
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 bg-slate-900 p-4 rounded-lg border border-slate-800">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by user, product, or item ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>
        </div>

        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-700">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Stores</SelectItem>
            {Array.from(stores.entries()).map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">
              {logs.length === 0
                ? "No deleted items found"
                : "No results match your filters"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="px-4 py-3 text-left font-bold text-slate-200">
                    Deleted At
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-slate-200">
                    Product/Item
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-slate-200">
                    Deleted By
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-slate-200">
                    Store
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-slate-200">
                    Item ID
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-slate-200">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={cn(
                      "border-b border-slate-800 hover:bg-slate-800/50 transition-colors",
                      idx % 2 === 0 ? "bg-slate-900/50" : ""
                    )}
                  >
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="text-xs">{formatDate(log.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      <div className="max-w-xs truncate">{log.message}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex flex-col">
                        <span className="font-semibold">{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {stores.get(log.storeId || "") || log.storeId || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                      {log.metadata?.itemId || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && hasMore && filteredLogs.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchLogs(true)}
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Deletion Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Deleted Product
                </label>
                <p className="text-slate-100 mt-1">{selectedLog.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Item ID
                  </label>
                  <p className="text-slate-100 mt-1 font-mono text-xs">
                    {selectedLog.metadata?.itemId || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    User ID
                  </label>
                  <p className="text-slate-100 mt-1 font-mono text-xs">
                    {selectedLog.userId}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Deleted By
                </label>
                <p className="text-slate-100 mt-1">{selectedLog.userEmail}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Store
                </label>
                <p className="text-slate-100 mt-1">
                  {stores.get(selectedLog.storeId || "") || selectedLog.storeId || "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Date & Time
                </label>
                <p className="text-slate-100 mt-1">{formatDate(selectedLog.timestamp)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
