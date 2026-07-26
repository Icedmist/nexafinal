import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Loader2, Globe } from "lucide-react";

interface StoreLocation {
  id: string;
  name: string;
  sector: string;
  manager: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status?: string;
}

export default function SystemAdminMapPage() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stores"), (snap) => {
      const list: StoreLocation[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || d.id,
          sector: data.sector || "General",
          manager: data.manager || "Unassigned",
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || "",
          status: data.status || "active",
        });
      });
      setStores(list);
      setLoading(false);
    }, () => {
      setStores([]);
      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Loading store locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            Store Locations Map
          </h2>
          <p className="text-xs text-muted-foreground">
            Geographic distribution of all registered store branches.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 font-mono text-xs w-fit">
          {stores.length} Active Locations
        </Badge>
      </div>

      {/* Map Placeholder */}
      <Card className="shadow-none border border-muted-foreground/10">
        <CardContent className="p-0">
          <div className="relative h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Interactive Map</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Connect a mapping provider (Google Maps, Mapbox, or Leaflet) to display store locations visually.
                  </p>
                </div>
              </div>
            </div>

            {/* Store markers (visual dots) */}
            {stores.map((store, idx) => {
              const positions = [
                { top: "25%", left: "30%" },
                { top: "40%", left: "55%" },
                { top: "60%", left: "20%" },
                { top: "35%", left: "75%" },
                { top: "70%", left: "45%" },
                { top: "20%", left: "65%" },
              ];
              const pos = positions[idx % positions.length];
              return (
                <div key={store.id} className="absolute group cursor-pointer" style={{ top: pos.top, left: pos.left }}>
                  <div className="relative">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg animate-pulse" />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-muted-foreground/10 rounded-lg px-2.5 py-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      <p className="text-[10px] font-bold text-foreground">{store.name}</p>
                      <p className="text-[9px] text-muted-foreground">{store.sector}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Store Location List */}
      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-500" /> Registered Store Locations
          </CardTitle>
          <CardDescription className="text-xs">All branches with their geographic and operational details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {stores.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No store locations registered yet.</div>
            ) : (
              stores.map((store) => (
                <div key={store.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{store.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {store.sector} • Manager: {store.manager}
                      </p>
                      {store.address && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{store.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-[9px] font-bold uppercase ${
                      store.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {store.status || "active"}
                    </Badge>
                    {store.latitude && store.longitude && (
                      <p className="text-[9px] text-muted-foreground font-mono mt-1">
                        {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
