import { useState, useMemo } from "react";
import { Search, User, Phone, ShoppingBag } from "lucide-react";
import { useSales } from "@/hooks/useSalesData";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { exportCustomersPDF } from "@/lib/pdf-export";

const NAIRA = "₦";

interface CustomerRecord {
  name: string;
  phone: string;
  totalSpent: number;
  transactionCount: number;
  lastPurchase: string;
}

export function CustomerDirectory() {
  const { data: sales, isLoading } = useSales();
  const { profile } = useBusiness();
  const [search, setSearch] = useState("");

  const storeName = profile?.storeDetails?.name || "Nexa Store OS";

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRecord>();

    for (const sale of sales) {
      const phone = sale.customerPhone?.trim();
      if (!phone) continue;
      const existing = map.get(phone);
      if (existing) {
        existing.totalSpent += sale.totalNgn;
        existing.transactionCount++;
        if (sale.createdAt > existing.lastPurchase) {
          existing.lastPurchase = sale.createdAt;
          if (sale.customerName) existing.name = sale.customerName;
        }
      } else {
        map.set(phone, {
          name: sale.customerName || "Customer",
          phone,
          totalSpent: sale.totalNgn,
          transactionCount: 1,
          lastPurchase: sale.createdAt,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Customer Directory</CardTitle>
            <CardDescription>Customers are automatically saved from sales with phone numbers.</CardDescription>
          </div>
          {filtered.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest hover:bg-muted/50"
              onClick={() => exportCustomersPDF(filtered, storeName)}
            >
              Export PDF
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone…" className="pl-9" />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={User} title="No customers yet" description="Complete a sale with a customer phone number to start building your directory." />
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div key={c.phone} className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />{c.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">{NAIRA}{c.totalSpent.toLocaleString("en-NG")}</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <ShoppingBag className="h-3 w-3" />{c.transactionCount} sale{c.transactionCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
