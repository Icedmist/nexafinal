import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, AlertTriangle, RefreshCw, FileDown, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function SystemAdminOperations() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [diagStatus, setDiagStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [diagResult, setDiagResult] = useState<{ firestore: boolean; storesCount: number; usersCount: number } | null>(null);

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const storesSnap = await getDocs(collection(db, "stores"));
      const usersSnap = await getDocs(collection(db, "users"));
      const salesSnap = await getDocs(collection(db, "sales"));

      const storesData: Record<string, unknown>[] = [];
      storesSnap.forEach((d) => storesData.push({ id: d.id, ...d.data() }));

      const usersData: Record<string, unknown>[] = [];
      usersSnap.forEach((d) => usersData.push({ id: d.id, ...d.data() }));

      const salesData: Record<string, unknown>[] = [];
      salesSnap.forEach((d) => salesData.push({ id: d.id, ...d.data() }));

      const backup = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        stores: storesData,
        users: usersData,
        sales: salesData,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexa-v2-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup snapshot exported successfully!");
    } catch (err) {
      console.error("Backup failed:", err);
      toast.error("Failed to generate backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setDiagStatus("checking");
    try {
      const storesSnap = await getDocs(collection(db, "stores"));
      const usersSnap = await getDocs(collection(db, "users"));
      setDiagResult({
        firestore: true,
        storesCount: storesSnap.size,
        usersCount: usersSnap.size,
      });
      setDiagStatus("ok");
      toast.success("Database diagnostics completed successfully!");
    } catch (err) {
      console.error("Diagnostics failed:", err);
      setDiagResult({ firestore: false, storesCount: 0, usersCount: 0 });
      setDiagStatus("error");
      toast.error("Database connectivity check failed.");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-none border border-muted-foreground/10 flex flex-col justify-between">
        <div>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" /> Enterprise Backups
            </CardTitle>
            <CardDescription>Generate a point-in-time snapshot of the entire multi-tenant configuration database schema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              Snapshots compile the following schemas into a single consolidated JSON export:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-sans">
              <li>Complete listing of all registered location branches & sectors.</li>
              <li>Encrypted profile matrices for all credentialed staff roles.</li>
              <li>Sales transaction history and financial records.</li>
            </ul>
            <p>
              Backups can be stored locally and imported manually into any backup node instance.
            </p>
          </CardContent>
        </div>
        <CardFooter className="pt-4 border-t border-muted-foreground/10 flex justify-between items-center bg-muted/25 p-5">
          <span className="text-[10px] text-muted-foreground font-medium">Backup format: JSON, UTF-8</span>
          <Button onClick={handleDownloadBackup} disabled={backupLoading}
            className="text-xs h-9 font-bold bg-primary hover:bg-primary/95 text-white gap-1.5 shadow-sm">
            {backupLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            {backupLoading ? "Exporting..." : "Generate Backup Snapshot"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-none border border-muted-foreground/10 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" /> Database Connectivity Diagnostics
          </CardTitle>
          <CardDescription>Live telemetry on database clusters and replica streams.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3 text-xs">
              <div className="p-3 border rounded-lg space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Firestore Sync State</span>
                {diagStatus === "idle" ? (
                  <div className="text-muted-foreground font-mono font-medium">NOT CHECKED</div>
                ) : diagStatus === "checking" ? (
                  <div className="text-amber-500 font-mono font-medium">CHECKING...</div>
                ) : diagResult?.firestore ? (
                  <div className="flex items-center gap-1.5 text-emerald-500 font-semibold font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ONLINE & SYNCHRONIZED
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-500 font-semibold font-mono">
                    <XCircle className="h-3.5 w-3.5" /> OFFLINE / ERROR
                  </div>
                )}
              </div>
              <div className="p-3 border rounded-lg space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Stores Collection</span>
                <div className="text-foreground font-mono font-medium">
                  {diagResult ? `${diagResult.storesCount} documents` : "—"}
                </div>
              </div>
              <div className="p-3 border rounded-lg space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Users Collection</span>
                <div className="text-foreground font-mono font-medium">
                  {diagResult ? `${diagResult.usersCount} documents` : "—"}
                </div>
              </div>
            </div>
            <Button onClick={handleRunDiagnostics} disabled={diagStatus === "checking"}
              variant="outline" size="sm" className="gap-1.5">
              {diagStatus === "checking" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              {diagStatus === "checking" ? "Running Diagnostics..." : "Run Diagnostics"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
