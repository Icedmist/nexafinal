import { useState, useEffect } from "react";
import { collection, query, limit, orderBy, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { ShoppingBag } from "lucide-react";

interface PlatformSale {
  id: string;
  storeId: string;
  total: number;
  recordedByName: string;
  createdAt: any;
}

function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return "Unknown";
  const date = timestamp?.toDate?.() || new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

export function PlatformSalesMonitor() {
  const [sales, setSales] = useState<PlatformSale[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "sales"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlatformSale[];
      setSales(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          Global Commerce Stream
        </h3>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-mono">
          All Stores
        </span>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="py-4 text-center text-xs text-muted-foreground animate-pulse font-mono">Syncing live transactions...</div>
        ) : sales.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground italic">No recent transactions recorded.</div>
        ) : (
          sales.map((sale) => (
            <div 
              key={sale.id} 
              onClick={() => navigate("/app/sales-history")}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/30 transition-all group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground font-sans">{'\u20A6'}{sale.total?.toLocaleString() || "0"}</span>
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">Store: {sale.storeId}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-foreground">{sale.recordedByName || "Cashier"}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{formatRelativeTime(sale.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
