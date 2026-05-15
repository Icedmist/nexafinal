import { useState, useEffect } from "react";
import { collection, query, limit, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformSale {
  id: string;
  storeId: string;
  total: number;
  recordedByName: string;
  createdAt: any;
}

export function PlatformSalesMonitor() {
  const [sales, setSales] = useState<PlatformSale[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Global Commerce Stream</h3>
        <span className="text-[10px] font-bold text-blue-400">All Stores</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-4 text-center text-xs text-slate-600 animate-pulse">Syncing transactions...</div>
        ) : sales.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-600 italic">No recent transactions.</div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3 hover:bg-slate-900 transition-all group">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">${sale.total?.toFixed(2) || "0.00"}</span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[120px]">Store: {sale.storeId}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400">{sale.recordedByName}</span>
                <span className="text-[8px] text-slate-600 uppercase">Just now</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="flex items-center justify-center gap-2 mt-2 w-full rounded-xl border border-slate-800 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-900 hover:text-slate-300">
        Commerce Explorer <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
