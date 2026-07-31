import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Activity,
  ShieldAlert,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  Building2,
  CheckCircle2,
  Radio,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  INITIAL_GEO_STORES,
  INITIAL_DEVICE_TELEMETRY,
  captureClientDeviceTelemetry,
  type StoreGeoNode,
  type DeviceTelemetry,
} from "@/lib/telemetry";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const SECTOR_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  agriculture: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", dot: "#10b981" },
  pharmacy: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30", dot: "#3b82f6" },
  restaurant: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30", dot: "#a855f7" },
  general: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30", dot: "#f59e0b" },
};

export function SuperAdminGeoMap() {
  const [stores, setStores] = useState<StoreGeoNode[]>(INITIAL_GEO_STORES);
  const [devices, setDevices] = useState<DeviceTelemetry[]>(INITIAL_DEVICE_TELEMETRY);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedStore, setSelectedStore] = useState<StoreGeoNode | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceTelemetry | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isWatchingGps, setIsWatchingGps] = useState(false);

  // Firestore Real-time stores & telemetry listener
  useEffect(() => {
    const unsubStores = onSnapshot(
      collection(db, "stores"),
      (snap) => {
        if (!snap.empty) {
          const list: StoreGeoNode[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              name: data.storeName || data.name || "Unnamed Store",
              sector: (data.businessType || data.sector || "general") as StoreGeoNode["sector"],
              manager: data.ownerName || data.manager || "Store Manager",
              managerEmail: data.managerEmail || data.ownerEmail || "",
              state: data.state || "Lagos",
              country: data.country || "Nigeria",
              latitude: data.latitude || (data.state?.toLowerCase().includes("abuja") ? 9.0765 : 6.5244),
              longitude: data.longitude || (data.state?.toLowerCase().includes("abuja") ? 7.3986 : 3.3792),
              activeDevicesCount: data.activeDevicesCount || data.activeDevices || 1,
              valuationNgn: data.valuationNgn || 0,
              healthScore: data.healthScore || 0,
              status: (data.status || "active") as StoreGeoNode["status"],
              lastDeviceActive: data.lastDeviceActive || data.updatedAt || new Date().toISOString(),
            });
          });
          setStores(list);
        }
      },
      (err) => console.warn("Could not load real-time stores for map:", err)
    );

    const unsubDevices = onSnapshot(
      collection(db, "device_telemetry"),
      (snap) => {
        if (!snap.empty) {
          const list: DeviceTelemetry[] = [];
          snap.forEach((d) => list.push(d.data() as DeviceTelemetry));
          // Merge with initial list
          const merged = [...INITIAL_DEVICE_TELEMETRY];
          list.forEach((newItem) => {
            if (!merged.some((existing) => existing.id === newItem.id)) {
              merged.unshift(newItem);
            }
          });
          setDevices(merged);
        }
      },
      (err) => console.warn("Could not load real-time device telemetry:", err)
    );

    return () => {
      unsubStores();
      unsubDevices();
    };
  }, []);

  // Auto-capture client device telemetry on initial render
  useEffect(() => {
    captureClientDeviceTelemetry(
      "nexatechnologies.dev@gmail.com",
      "store-1",
      "Main Warehouse"
    ).then((res) => {
      if (res) {
        setDevices((prev) => [res, ...prev.filter((d) => d.id !== res.id)]);
      }
    });
  }, []);

  // Continuous real-time GPS tracking stream
  useEffect(() => {
    if (!isWatchingGps || typeof window === "undefined" || !("geolocation" in navigator)) return;

    toast.info("Live GPS Tracking Stream Active", {
      description: "Continuously syncing real-time latitude & longitude coordinates...",
    });

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const latitude = parseFloat(pos.coords.latitude.toFixed(4));
        const longitude = parseFloat(pos.coords.longitude.toFixed(4));

        let locationName = `GPS Point (${latitude}, ${longitude})`;
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            const city = revData.locality || revData.city || revData.principalSubdivision || "";
            const country = revData.countryName || "";
            if (city || country) {
              locationName = `${[city, country].filter(Boolean).join(", ")} (${latitude}, ${longitude})`;
            }
          }
        } catch (e) {
          console.info("GPS watch reverse geocode fallback:", e);
        }

        setDevices((prev) => {
          if (prev.length === 0) return prev;
          const nextList = [...prev];
          nextList[0] = {
            ...nextList[0],
            latitude,
            longitude,
            locationName,
            lastActive: new Date().toISOString(),
            status: "online",
          };
          return nextList;
        });
      },
      (err) => {
        console.warn("GPS watch error:", err);
        toast.error("GPS stream stopped: " + err.message);
        setIsWatchingGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isWatchingGps]);

  // Capture local browser GPS & specs manually
  const handleCaptureMyDevice = async () => {
    setIsCapturing(true);
    toast.info("Requesting browser GPS & hardware telemetry...", {
      description: "Allow location access if prompted by your browser.",
    });

    const res = await captureClientDeviceTelemetry(
      "nexatechnologies.dev@gmail.com",
      "store-1",
      "Main Warehouse"
    );

    setIsCapturing(false);
    if (res) {
      setDevices((prev) => [res, ...prev.filter((d) => d.id !== res.id)]);
      setSelectedDevice(res);
      toast.success("Device Telemetry & GPS Coordinates Captured!", {
        description: `Captured Lat: ${res.latitude}, Lng: ${res.longitude} (${res.locationName}).`,
      });
    }
  };

  // Filtered store nodes
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.state.toLowerCase().includes(search.toLowerCase()) ||
        s.manager.toLowerCase().includes(search.toLowerCase());
      const matchSector = sectorFilter === "all" || s.sector === sectorFilter;
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchSector && matchStatus;
    });
  }, [stores, search, sectorFilter, statusFilter]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch =
        d.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
        d.storeName?.toLowerCase().includes(search.toLowerCase()) ||
        d.platform.toLowerCase().includes(search.toLowerCase()) ||
        d.ipAddress.toLowerCase().includes(search.toLowerCase());
      const matchType = deviceTypeFilter === "all" || d.deviceType === deviceTypeFilter;
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [devices, search, deviceTypeFilter, statusFilter]);

  // Map coordinates projection helper (Maps Lat/Lng to SVG canvas coordinates)
  const getCanvasCoords = (lat: number, lng: number) => {
    let minLat = 4.0;
    let maxLat = 14.0;
    let minLng = 2.5;
    let maxLng = 14.5;

    // Expand to global coordinate mapping if coordinates fall outside West Africa
    if (lat < 3.0 || lat > 15.0 || lng < 1.0 || lng > 16.0) {
      minLat = -60;
      maxLat = 75;
      minLng = -180;
      maxLng = 180;
    }

    const xPct = Math.max(6, Math.min(94, ((lng - minLng) / (maxLng - minLng)) * 100));
    const yPct = Math.max(6, Math.min(94, (1 - (lat - minLat) / (maxLat - minLat)) * 100));

    return { x: `${xPct.toFixed(1)}%`, y: `${yPct.toFixed(1)}%` };
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary animate-[spin_4s_linear_infinite]" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Super Admin Live Geo & Device Map
            </h2>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold text-xs">
              Live GPS Sync Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time interactive spatial map monitoring multi-tenant store branches, onboarded user device telemetry, and hardware signatures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsWatchingGps(!isWatchingGps)}
            variant={isWatchingGps ? "default" : "outline"}
            className={`text-xs h-9 gap-2 font-medium ${
              isWatchingGps ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
          >
            <Activity className={`h-4 w-4 ${isWatchingGps ? "animate-spin text-white" : "text-emerald-500"}`} />
            {isWatchingGps ? "Live GPS Stream Active" : "Enable Live GPS Stream"}
          </Button>

          <Button
            onClick={handleCaptureMyDevice}
            disabled={isCapturing}
            className="bg-primary text-primary-foreground text-xs h-9 gap-2 shadow-xs font-medium"
          >
            <Radio className={`h-4 w-4 ${isCapturing ? "animate-ping text-emerald-400" : ""}`} />
            {isCapturing ? "Capturing GPS..." : "Capture My Device Telemetry"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 shadow-none border">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Geographic Branches</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stores.length}</p>
          <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">Across 6 States</span>
        </Card>

        <Card className="p-4 shadow-none border">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Connected Devices</span>
            <Cpu className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{devices.length}</p>
          <span className="text-[10px] text-purple-500 font-bold block mt-0.5">Mobile, POS & Laptops</span>
        </Card>

        <Card className="p-4 shadow-none border">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Online Pings</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {devices.filter((d) => d.status === "online").length}
          </p>
          <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">Active Heartbeats</span>
        </Card>

        <Card className="p-4 shadow-none border">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>System Telemetry</span>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">100%</p>
          <span className="text-[10px] text-muted-foreground block mt-0.5">Hardware Encrypted</span>
        </Card>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stores, state, email, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
          >
            <option value="all">All Sectors</option>
            <option value="agriculture">Agribusiness</option>
            <option value="pharmacy">Pharmacy Hub</option>
            <option value="restaurant">Food & Restaurant</option>
            <option value="general">General Retail</option>
          </select>

          <select
            value={deviceTypeFilter}
            onChange={(e) => setDeviceTypeFilter(e.target.value)}
            className="text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
          >
            <option value="all">All Devices</option>
            <option value="desktop">Desktop / Workstation</option>
            <option value="mobile">Mobile Phones</option>
            <option value="tablet">POS Tablets</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online / Active</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Interactive Map Visualizer Canvas */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Spatial Map Canvas Component */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative w-full h-[520px] rounded-xl border bg-slate-950/90 dark:bg-slate-950 overflow-hidden shadow-inner flex flex-col justify-between p-4 border-slate-800">
            {/* Top Overlay Legend */}
            <div className="z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-400">Map Nodes:</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/50" />
                  <span>Agro</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-blue-500 inline-block shadow-xs shadow-blue-500/50" />
                  <span>Pharmacy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-purple-500 inline-block shadow-xs shadow-purple-500/50" />
                  <span>Food</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500 inline-block shadow-xs shadow-amber-500/50" />
                  <span>Retail</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>Pulsing rings = Active Devices</span>
              </div>
            </div>

            {/* Vector Background Spatial Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                {/* West Africa Region Outline Approximation */}
                <path
                  d="M 100 120 Q 250 80 450 150 T 700 250 T 800 450"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>

            {/* Render Store Pins */}
            <div className="absolute inset-0 p-6 pointer-events-auto">
              {filteredStores.map((store) => {
                const coords = getCanvasCoords(store.latitude, store.longitude);
                const color = SECTOR_COLORS[store.sector] || SECTOR_COLORS.general;

                return (
                  <button
                    key={store.id}
                    onClick={() => {
                      setSelectedStore(store);
                      setSelectedDevice(null);
                    }}
                    style={{ left: coords.x, top: coords.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 hover:scale-125 focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 transition-all"
                        style={{ backgroundColor: color.dot }}
                      >
                        <Building2 className="h-4 w-4 text-white" />
                      </div>

                      {/* Store Name Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {store.name} ({store.state})
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Render Device Telemetry Markers */}
              {filteredDevices.map((device) => {
                const coords = getCanvasCoords(device.latitude, device.longitude);
                const isOnline = device.status === "online";

                return (
                  <button
                    key={device.id}
                    onClick={() => {
                      setSelectedDevice(device);
                      setSelectedStore(null);
                    }}
                    style={{ left: coords.x, top: coords.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 hover:scale-125 focus:outline-none z-20"
                  >
                    <div className="relative flex items-center justify-center">
                      {/* Pulse Ring for Online */}
                      {isOnline && (
                        <span className="absolute h-8 w-8 rounded-full bg-emerald-500/40 animate-ping" />
                      )}

                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center shadow-md border border-slate-900 ${
                          isOnline ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {device.deviceType === "mobile" ? (
                          <Smartphone className="h-3.5 w-3.5" />
                        ) : device.deviceType === "tablet" ? (
                          <Tablet className="h-3.5 w-3.5" />
                        ) : (
                          <Laptop className="h-3.5 w-3.5" />
                        )}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-slate-200 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-700 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {device.userEmail} ({device.platform})
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Status Ribbon */}
            <div className="z-10 bg-slate-900/80 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
              <span>Showing {filteredStores.length} stores & {filteredDevices.length} active device telemetry nodes</span>
              <span className="text-slate-400 font-mono">Center: Nigeria (6.5244° N, 3.3792° E)</span>
            </div>
          </div>
        </div>

        {/* Selected Node Details Card */}
        <div className="space-y-4">
          {selectedStore ? (
            <Card className="border shadow-none">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] uppercase font-bold">
                    Store Node Details
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStore(null)} className="h-6 w-6 p-0 text-muted-foreground">
                    ✕
                  </Button>
                </div>
                <CardTitle className="text-lg font-bold text-foreground mt-2">
                  {selectedStore.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedStore.state}, {selectedStore.country}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded bg-muted/40 p-2">
                    <span className="text-muted-foreground block text-[10px] uppercase">Business Sector</span>
                    <span className="font-bold text-foreground capitalize">{selectedStore.sector}</span>
                  </div>
                  <div className="rounded bg-muted/40 p-2">
                    <span className="text-muted-foreground block text-[10px] uppercase">Manager</span>
                    <span className="font-bold text-foreground">{selectedStore.manager}</span>
                  </div>
                  <div className="rounded bg-muted/40 p-2">
                    <span className="text-muted-foreground block text-[10px] uppercase">Valuation</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₦{selectedStore.valuationNgn.toLocaleString()}</span>
                  </div>
                  <div className="rounded bg-muted/40 p-2">
                    <span className="text-muted-foreground block text-[10px] uppercase">Health Score</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{selectedStore.healthScore}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-t pt-3">
                  <span className="font-semibold text-foreground block">GPS Coordinates:</span>
                  <div className="flex items-center justify-between bg-muted p-2 rounded font-mono text-[11px]">
                    <span>{selectedStore.latitude}° N, {selectedStore.longitude}° E</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${selectedStore.latitude}, ${selectedStore.longitude}`, "Coordinates")}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps?q=${selectedStore.latitude},${selectedStore.longitude}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedDevice ? (
            <Card className="border shadow-none">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-[10px] uppercase font-bold">
                    Device Telemetry Node
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDevice(null)} className="h-6 w-6 p-0 text-muted-foreground">
                    ✕
                  </Button>
                </div>
                <CardTitle className="text-lg font-bold text-foreground mt-2 flex items-center gap-2">
                  {selectedDevice.deviceType === "mobile" ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                  {selectedDevice.platform}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedDevice.userEmail}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Store Associated:</span>
                    <span className="font-semibold text-foreground">{selectedDevice.storeName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-bold text-emerald-500 uppercase">{selectedDevice.status}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">IP & Carrier:</span>
                    <span className="font-mono text-[11px] text-foreground">{selectedDevice.ipAddress}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Screen Res:</span>
                    <span className="font-mono text-[11px] text-foreground">{selectedDevice.screenResolution}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Last Active Ping:</span>
                    <span className="font-mono text-[11px] text-foreground">
                      {new Date(selectedDevice.lastActive).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 border-t pt-3">
                  <span className="font-semibold text-foreground block">GPS Telemetry:</span>
                  <div className="flex items-center justify-between bg-muted p-2 rounded font-mono text-[11px]">
                    <span>{selectedDevice.latitude}, {selectedDevice.longitude}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${selectedDevice.latitude}, ${selectedDevice.longitude}`, "Coordinates")}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps?q=${selectedDevice.latitude},${selectedDevice.longitude}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Device Pin on Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-none bg-muted/20">
              <CardContent className="p-8 text-center space-y-3">
                <MapPin className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                <h3 className="font-bold text-sm text-foreground">Select a Map Node</h3>
                <p className="text-xs text-muted-foreground">
                  Click any store pin or active device marker on the spatial canvas to inspect real-time GPS telemetry, user details, and hardware specifications.
                </p>
              </CardContent>
            </Card>
          )}

          {/* List of Recent Telemetry Stream Entries */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Telemetry Stream</span>
                <Badge variant="outline" className="text-[9px] font-bold">
                  {devices.length} Devices
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y max-h-60 overflow-y-auto">
                {devices.slice(0, 5).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDevice(d);
                      setSelectedStore(null);
                    }}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-semibold text-foreground truncate">{d.userEmail}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{d.platform} • {d.locationName}</div>
                    </div>
                    <Badge variant="secondary" className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {d.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
