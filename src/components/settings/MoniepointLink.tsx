import { useState, useEffect } from "react";
import { 
  Activity, Link2, Link2Off, CheckCircle2, AlertTriangle, Key, 
  RefreshCw, Eye, EyeOff, ShieldCheck, HelpCircle, Terminal 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { doc, onSnapshot, getFirestore } from "firebase/firestore";

export function MoniepointLink() {
  const { claims } = useAuth();
  const { store } = useTenant();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  
  // Linked account state
  const [account, setAccount] = useState<any>(null);
  
  // Form input states
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

  // Roles verification
  const isOwner = claims?.role === "owner" || claims?.role === "system_admin";
  const isManager = claims?.role === "manager";
  
  // Real-time synchronization of Moniepoint link state from Firestore
  useEffect(() => {
    if (!store?.id) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, "moniepoint_accounts", store.id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.isLinked) {
        setAccount(docSnap.data());
      } else {
        setAccount(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching Moniepoint state:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [store?.id, db]);

  // Performs integration linking via Firebase Callable Cloud Function
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Please enter a valid Moniepoint API key");
      return;
    }

    if (!isOwner) {
      toast.error("Access Denied: Only store owners can link B2B accounts.");
      return;
    }

    setLinking(true);
    setDiagnosticStatus("running");
    setDiagnosticLogs(["[1/3] Initiating secure B2B linkage process...", "[2/3] Encrypting API Token and validating scopes..."]);

    try {
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("@/lib/firebase");
      const linkAccountFn = httpsCallable(functions, "linkmoniepointaccount");

      const res = await linkAccountFn({ apiKey: apiKey.trim(), storeId: store?.id });
      const data = res.data as any;

      if (data.success) {
        setDiagnosticStatus("success");
        setDiagnosticLogs(prev => [
          ...prev,
          `[3/3] Moniepoint connection authorized! Webhook group registered for business '${data.businessName}'.`
        ]);
        toast.success(`Successfully linked to ${data.businessName}!`);
        setApiKey("");
      } else {
        throw new Error("linking was not successful");
      }
    } catch (err: any) {
      console.error("Linking Error:", err);
      setDiagnosticStatus("error");
      setDiagnosticLogs(prev => [...prev, `[ERROR] Connection failed: ${err.message || "Failed to introspect API key."}`]);
      toast.error(err.message || "Connection refused by Moniepoint API.");
    } finally {
      setLinking(false);
    }
  };

  // Performs connection unlinking via Cloud Function
  const handleUnlink = async () => {
    if (!isOwner) {
      toast.error("Access Denied: Only the store owner can terminate payment connections.");
      return;
    }

    if (!window.confirm("Are you sure you want to terminate real-time Moniepoint transaction mirroring? Your terminals will stop syncing.")) {
      return;
    }

    setUnlinking(true);
    try {
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("@/lib/firebase");
      const unlinkAccountFn = httpsCallable(functions, "unlinkmoniepointaccount");

      await unlinkAccountFn({ storeId: store?.id });
      toast.success("Moniepoint integration disconnected successfully.");
      setDiagnosticStatus("idle");
      setDiagnosticLogs([]);
    } catch (err: any) {
      console.error("Unlinking Error:", err);
      toast.error(err.message || "Failed to disconnect account.");
    } finally {
      setUnlinking(false);
    }
  };

  // Fills credentials with sandbox configurations for swift local development testing
  const handleSandboxQuickstart = () => {
    setApiKey("sandbox_nexa_pos_terminal_feed_key_2026");
    toast.info("Sandbox developer credentials populated!");
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      {/* Premium Diagnostic header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-primary/5 blur-[50px] pointer-events-none rounded-full" />
        <div className="flex items-start gap-4">
          <div className="bg-primary/20 rounded-2xl p-3 text-primary shadow-inner">
            <Activity className={`h-6 w-6 ${account ? "animate-pulse" : ""}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-primary">Moniepoint POS Integration</h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
              Synchronize physical POS terminal card swipes and bank transfers directly to your NEXA OS Ledger.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {account ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Mirroring Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Connection Inactive
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                Multi-Tenant Scoped
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Connection Interface */}
      {account ? (
        <Card className="border-border bg-card shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Connection Overview
            </CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Review active store configuration credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Business Name</p>
                <p className="mt-1 text-base font-bold text-foreground">{account.businessName}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Merchant Reference</p>
                <p className="mt-1 text-base font-bold font-mono text-primary">{account.merchantReference}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Webhook Subscription Group ID</p>
                <p className="mt-1 text-xs font-semibold font-mono text-foreground break-all">{account.webhookGroupId || "Pending Registration..."}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Linked On</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{new Date(account.linkedAt).toLocaleString()}</p>
              </div>
            </div>

            {isOwner ? (
              <div className="flex gap-3">
                <Button 
                  onClick={handleUnlink} 
                  disabled={unlinking}
                  variant="destructive" 
                  className="rounded-xl px-5 font-black uppercase tracking-widest text-xs h-10 gap-2 border-red-500/20 shadow-md"
                >
                  <Link2Off className="h-4 w-4" /> 
                  {unlinking ? "Disconnecting..." : "Unlink Connection"}
                </Button>
              </div>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400 italic">
                Only the designated Store Owner can modify credentials or unlink connections.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Setup Token Provisioning
            </CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Enter your Moniepoint Business API key to establish a live mirroring pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <form onSubmit={handleLink} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="api-key" className="text-xs font-black uppercase tracking-wider">Business API Key / Token</Label>
                    <button 
                      type="button" 
                      onClick={handleSandboxQuickstart}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      🚀 Pop Sandbox Token
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="api-key" 
                      type={showKey ? "text" : "password"} 
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pl-10 pr-10 font-mono text-sm rounded-xl h-11"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed flex gap-2">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    Your token is encrypted using secure military-grade symmetric **AES-256-GCM** before database serialization. 
                    NEXA will automatically invoke Moniepoint webhooks subscription on success.
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={linking || !apiKey}
                  className="w-full rounded-xl h-11 font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/20"
                >
                  <RefreshCw className={`h-4 w-4 ${linking ? "animate-spin" : ""}`} /> 
                  {linking ? "Validating & Registering..." : "Provision Moniepoint Link"}
                </Button>
              </form>
            ) : (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto animate-bounce mb-3" />
                <h3 className="font-black uppercase tracking-widest text-destructive text-sm">Privilege Escalation Blocked</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                  You are currently logged in as a <strong>{claims?.role || "Staff"}</strong>. Moniepoint account linking is strictly scoped to the store's primary <strong>OWNER</strong> credentials.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Real-time Diagnostics Terminal */}
      {diagnosticStatus !== "idle" && (
        <Card className="border-border bg-[#030712] rounded-3xl shadow-xl">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Diagnostic Link Terminal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="font-mono text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
              {diagnosticLogs.map((log, idx) => (
                <div key={idx} className={log.includes("[ERROR]") ? "text-red-400" : log.includes("[3/3]") ? "text-emerald-400 font-bold" : "text-gray-300"}>
                  {log}
                </div>
              ))}
              {diagnosticStatus === "running" && (
                <div className="flex items-center gap-2 text-primary text-[10px] animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  Awaiting server handshake...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
