import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MessageSquare,
  Smartphone,
  Info,
  ExternalLink,
  ShieldAlert,
  Lock,
  Unlock,
  Radio,
  Send,
  Bell,
  Mail,
  UserPlus,
  CreditCard,
  Users,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, addDoc } from "firebase/firestore";

interface StoreDoc {
  id: string;
  name: string;
  sector: string;
  manager: string;
  managerEmail: string;
  valuationNgn: number;
  itemCount: number;
  status: string;
  healthScore: number;
}

interface UserDoc {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId: string;
  storeName: string;
  joinedDate: string;
}

interface WhatsAppConfig {
  enabledReceipts: boolean;
  enabledAlerts: boolean;
  defaultPrefix: string;
  webhookUrl: string;
  defaultTemplate: string;
}

export default function SystemAdminUpdates() {
  const [superStores, setSuperStores] = useState<StoreDoc[]>([]);
  const [superUsers, setSuperUsers] = useState<UserDoc[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>({
    enabledReceipts: true,
    enabledAlerts: true,
    defaultPrefix: "+234",
    webhookUrl: "",
    defaultTemplate: "",
  });

  // Feature Locks State
  const [lockedFeatures, setLockedFeatures] = useState<string[]>([]);

  // Targeted Broadcast State
  const [targetAudience, setTargetAudience] = useState<"all" | "store" | "user" | "paid" | "new_users">("all");
  const [targetStoreId, setTargetStoreId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendInApp, setSendInApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const [feedFilter, setFeedFilter] = useState<"all" | "new_users" | "paid_users">("all");

  useEffect(() => {
    const unsubStores = onSnapshot(collection(db, "stores"), (snap) => {
      const list: StoreDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as StoreDoc));
      setSuperStores(list);
    }, () => setSuperStores([]));

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as UserDoc));
      setSuperUsers(list);
    }, () => setSuperUsers([]));

    const unsubWA = onSnapshot(doc(db, "settings", "whatsapp"), (snap) => {
      if (snap.exists()) setWhatsapp(snap.data() as WhatsAppConfig);
    }, () => {});

    return () => { unsubStores(); unsubUsers(); unsubWA(); };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "feature_locks"), (snap) => {
      if (snap.exists()) {
        setLockedFeatures(snap.data().features || []);
      } else {
        setLockedFeatures([]);
      }
    }, () => {
      setLockedFeatures([]);
    });
    return unsub;
  }, []);

  const newUsersList = useMemo(() => {
    return [...superUsers].sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime());
  }, [superUsers]);

  const paidStoresList = useMemo(() => {
    return superStores.filter(s => s.valuationNgn > 0 || s.itemCount > 10 || s.status === "active");
  }, [superStores]);

  const handleDispatchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please provide both a broadcast title and message body.");
      return;
    }
    if (!sendInApp && !sendEmail && !sendWhatsApp) {
      toast.error("Please select at least one dispatch channel.");
      return;
    }

    let targetDescription = "All Users & Stores";
    let recipientCount = superUsers.length;

    if (targetAudience === "store") {
      const storeObj = superStores.find(s => s.id === targetStoreId);
      if (!storeObj) { toast.error("Please select a valid target store branch."); return; }
      targetDescription = `Branch: ${storeObj.name}`;
      recipientCount = superUsers.filter(u => u.storeId === storeObj.id).length || 1;
    } else if (targetAudience === "user") {
      const userObj = superUsers.find(u => u.id === targetUserId);
      if (!userObj) { toast.error("Please select a valid target user."); return; }
      targetDescription = `User: ${userObj.name} (${userObj.email})`;
      recipientCount = 1;
    } else if (targetAudience === "paid") {
      targetDescription = "Paid Subscriber Merchants";
      recipientCount = paidStoresList.length;
    } else if (targetAudience === "new_users") {
      targetDescription = "Newly Onboarded Staff & Users";
      recipientCount = newUsersList.length;
    }

    try {
      const now = new Date().toISOString();
      const notifId = `broadcast-${Date.now()}`;

      if (sendInApp) {
        const notifPayload = {
          id: notifId,
          type: "po_update" as const,
          title: `📢 ${broadcastTitle}`,
          message: broadcastMessage,
          isRead: false,
          read: false,
          createdAt: now,
          targetAudience,
          targetStoreId: targetAudience === "store" ? targetStoreId : null,
          targetUserId: targetAudience === "user" ? targetUserId : null,
          storeId: targetAudience === "store" ? targetStoreId : null,
          branchId: null,
        };
        try {
          await addDoc(collection(db, "notifications"), notifPayload);
        } catch (e) {
          console.warn("Firestore notification create fallback:", e);
        }
      }

      if (sendEmail) {
        let recipientEmail = "nexatechnologies.dev@gmail.com";
        if (targetAudience === "user") {
          const userObj = superUsers.find(u => u.id === targetUserId);
          if (userObj?.email) recipientEmail = userObj.email;
        } else if (targetAudience === "store") {
          const storeObj = superStores.find(s => s.id === targetStoreId);
          if (storeObj?.managerEmail) recipientEmail = storeObj.managerEmail;
        }
        const mailtoUri = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
          `[Stackwise System Alert] ${broadcastTitle}`
        )}&body=${encodeURIComponent(broadcastMessage)}`;
        window.open(mailtoUri, "_blank", "noopener,noreferrer");
      }

      if (sendWhatsApp) {
        let targetPhone = whatsapp.defaultPrefix || "+2348000000000";
        if (targetAudience === "store") {
          const storeObj = superStores.find(s => s.id === targetStoreId);
          if (storeObj?.manager) targetPhone = "+2348012345678";
        }
        const cleanPhone = targetPhone.replace(/\D/g, "");
        const waLink = getWhatsAppUrl(cleanPhone, `*[Stackwise Alert: ${broadcastTitle}]*\n\n${broadcastMessage}`);
        window.open(waLink, "_blank", "noopener,noreferrer");
      }

      const channelsUsed = [sendInApp && "In-App", sendEmail && "Email", sendWhatsApp && "WhatsApp"].filter(Boolean).join(", ");
      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: now,
        user: "nexatechnologies.dev@gmail.com (Super Admin)",
        action: `Dispatched Targeted Broadcast "${broadcastTitle}" to [${targetDescription}] via (${channelsUsed})`,
        store: targetAudience === "store" ? targetStoreId : "System-wide",
        status: "success" as const,
      });

      toast.success(`Broadcast successfully sent to ${recipientCount} recipient(s) via [${channelsUsed}]!`);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err) {
      console.error("Failed to dispatch broadcast:", err);
      toast.error("Failed to complete broadcast dispatch.");
    }
  };

  const applyTemplate = (title: string, msg: string) => {
    setBroadcastTitle(title);
    setBroadcastMessage(msg);
    toast.info(`Applied template: "${title}"`);
  };

  const toggleFeatureLock = async (featureId: string, label: string) => {
    const isCurrentlyLocked = lockedFeatures.includes(featureId);
    const nextLocked = isCurrentlyLocked
      ? lockedFeatures.filter(f => f !== featureId)
      : [...lockedFeatures, featureId];

    try {
      await setDoc(doc(db, "settings", "feature_locks"), { features: nextLocked });

      const notifId = `notif-${Date.now()}`;
      const notif = {
        id: notifId,
        type: (isCurrentlyLocked ? "request_update" : "po_update") as "request_update" | "po_update",
        title: isCurrentlyLocked ? `✅ Feature Unlocked: ${label}` : `🚨 Feature Locked: ${label}`,
        message: isCurrentlyLocked
          ? `The Super Administrator has restored access to the ${label} module.`
          : `The Super Administrator has temporarily locked the ${label} module.`,
        isRead: false,
        read: false,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "notifications"), notif);

      toast.success(isCurrentlyLocked ? `${label} unlocked successfully` : `${label} locked successfully`);
    } catch (err) {
      console.error("Failed to toggle feature lock:", err);
      toast.error("Failed to update feature control.");
    }
  };

  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("This is an authorized test dispatch from Stackwise System Root.");

  const handleToggleReceipts = async () => {
    const nextVal = !whatsapp.enabledReceipts;
    try {
      await setDoc(doc(db, "settings", "whatsapp"), { ...whatsapp, enabledReceipts: nextVal }, { merge: true });
      setWhatsapp(prev => ({ ...prev, enabledReceipts: nextVal }));
      toast.success(`WhatsApp POS receipt notifications ${nextVal ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save setting");
    }
  };

  const handleToggleAlerts = async () => {
    const nextVal = !whatsapp.enabledAlerts;
    try {
      await setDoc(doc(db, "settings", "whatsapp"), { ...whatsapp, enabledAlerts: nextVal }, { merge: true });
      setWhatsapp(prev => ({ ...prev, enabledAlerts: nextVal }));
      toast.success(`WhatsApp reorder stock alert notifications ${nextVal ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save setting");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "whatsapp"), whatsapp, { merge: true });
      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Re-configured WhatsApp Webhook gateway to "${whatsapp.webhookUrl}"`,
        store: "System-wide",
        status: "success",
      });
      toast.success("WhatsApp API Hub configurations saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save config to database.");
    }
  };

  const handleDispatchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) { toast.error("Please enter a destination phone number."); return; }
    const cleanNum = testPhone.replace(/\D/g, '');
    const apiLink = getWhatsAppUrl(cleanNum, testMsg);
    try {
      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Fired WhatsApp Dispatcher payload to target: +${cleanNum}`,
        store: "System-wide",
        status: "info",
      });
      toast.success("Constructing WhatsApp dispatch link...");
      window.open(apiLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log dispatch test.");
    }
  };

  const systemFeatures = [
    { id: "sales", label: "Sales POS & Checkout Terminal", desc: "Front-desk sales register, customer receipt dispatch, and credit-checkout transactions." },
    { id: "returns", label: "Returns & Refunds Manager", desc: "Item returns logging, damage tracking, and credit/refund balance payouts." },
    { id: "catalog", label: "Catalog & Item Configuration", desc: "Adding products, stock warning levels, and direct price adjustments." },
    { id: "movements", label: "Inventory Movements & Auditing", desc: "Received warehouse cargo log, stock transfer checks, and adjustments ledger." },
    { id: "expenses", label: "Operational Outflows Ledger", desc: "Logging daily store expenses, custom outflow categories, and cash summaries." },
    { id: "ecommerce", label: "Digital E-Commerce Storefront", desc: "Active storefront catalog, shopping carts, and incoming online consumer orders." },
    { id: "ai_insights", label: "AI Copilot & Smart Insights", desc: "Natural language query bar, intelligent reorder predictions, and reports generation." }
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-none border border-muted-foreground/10">
        <form onSubmit={handleDispatchBroadcast}>
          <CardHeader className="bg-primary/5 border-b border-muted-foreground/10 pb-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold font-sans flex items-center gap-2 text-primary">
                  <Send className="h-5.5 w-5.5 text-primary animate-bounce" /> Targeted Notification & Broadcast Engine
                </CardTitle>
                <CardDescription className="text-xs max-w-2xl">
                  Dispatch custom targeted in-app push notifications, emails, or WhatsApp broadcasts to specific users, store branches, or user cohorts in real-time.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase py-1 text-xs">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" /> Live Dispatch Gateway
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Target Audience Segment
                </Label>
                <Select value={targetAudience} onValueChange={(v: "all" | "store" | "user" | "paid" | "new_users") => setTargetAudience(v)}>
                  <SelectTrigger className="text-xs h-9 font-medium">
                    <SelectValue placeholder="Select target segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-medium">🌐 All Users & Store Branches ({superUsers.length})</SelectItem>
                    <SelectItem value="store" className="text-xs font-medium">🏢 Specific Store Branch</SelectItem>
                    <SelectItem value="user" className="text-xs font-medium">👤 Specific User Profile</SelectItem>
                    <SelectItem value="paid" className="text-xs font-medium">💳 Paid Subscriber Merchants ({paidStoresList.length})</SelectItem>
                    <SelectItem value="new_users" className="text-xs font-medium">🆕 Newly Onboarded Users ({newUsersList.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetAudience === "store" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-500" /> Select Target Branch
                  </Label>
                  <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                    <SelectTrigger className="text-xs h-9 font-medium">
                      <SelectValue placeholder="Choose store branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {superStores.map(store => (
                        <SelectItem key={store.id} value={store.id} className="text-xs">
                          {store.name} ({store.sector}) - Manager: {store.manager}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetAudience === "user" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-500" /> Select Target User
                  </Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId}>
                    <SelectTrigger className="text-xs h-9 font-medium">
                      <SelectValue placeholder="Choose user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {superUsers.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name} ({u.email}) - {u.storeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold block">Dispatch Channels</Label>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer bg-muted/30 px-2.5 py-1.5 rounded-md border border-muted-foreground/10 hover:bg-muted/50 transition">
                    <input type="checkbox" checked={sendInApp} onChange={e => setSendInApp(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <Bell className="h-3.5 w-3.5 text-amber-500" /> In-App Bell
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer bg-muted/30 px-2.5 py-1.5 rounded-md border border-muted-foreground/10 hover:bg-muted/50 transition">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <Mail className="h-3.5 w-3.5 text-blue-500" /> Email Alert
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer bg-muted/30 px-2.5 py-1.5 rounded-md border border-muted-foreground/10 hover:bg-muted/50 transition">
                    <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <Smartphone className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Quick Template Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="text-[11px] h-7 gap-1 border-muted-foreground/20 hover:bg-secondary"
                  onClick={() => applyTemplate("Scheduled Maintenance Notice", "Please be advised that Stackwise system maintenance is scheduled tonight from 2:00 AM to 3:00 AM WAT. Brief service interruptions may occur.")}>
                  <Sparkles className="h-3 w-3 text-amber-500" /> Scheduled Maintenance
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-[11px] h-7 gap-1 border-muted-foreground/20 hover:bg-secondary"
                  onClick={() => applyTemplate("Subscription Tier Renewal Notice", "Your merchant branch subscription is due for renewal. Please verify your invoice details in the Subscriptions Hub to maintain uninterrupted service.")}>
                  <CreditCard className="h-3 w-3 text-emerald-500" /> Subscription Renewal
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-[11px] h-7 gap-1 border-muted-foreground/20 hover:bg-secondary"
                  onClick={() => applyTemplate("New Feature Release Announcement", "We have enabled new AI Copilot & Automated Inventory Auditing capabilities for your branch! Visit the Dashboard to explore the updates.")}>
                  <CheckCircle2 className="h-3 w-3 text-blue-500" /> New Feature Release
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-title" className="text-xs font-semibold">Broadcast Title / Subject</Label>
                <Input id="broadcast-title" placeholder="e.g. Critical System Maintenance or Exclusive Offer..."
                  value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} className="text-xs font-sans h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-message" className="text-xs font-semibold">Message Body Payload</Label>
                <textarea id="broadcast-message" placeholder="Write clear, detailed messaging to be dispatched across selected channels..."
                  value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)}
                  className="w-full text-xs font-sans p-3 border border-input rounded-md bg-background focus:outline-none min-h-[90px]" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-3 pb-5 border-t border-muted-foreground/10 flex justify-between items-center bg-muted/10 px-6">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-primary" /> Dispatches instantly to targeted users across selected active channels.
            </span>
            <Button type="submit" className="text-xs h-9 font-bold bg-primary hover:bg-primary/95 text-white gap-2 shadow-md">
              <Send className="h-3.5 w-3.5" /> Dispatch Targeted Broadcast
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" /> Super Admin Live Notification Desk
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time feed tracking new user sign-ups, staff registrations, and paid subscription upgrades.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
            <Button variant={feedFilter === "all" ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => setFeedFilter("all")}>
              All Activity
            </Button>
            <Button variant={feedFilter === "new_users" ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1" onClick={() => setFeedFilter("new_users")}>
              <UserPlus className="h-3 w-3 text-blue-500" /> New Users ({newUsersList.length})
            </Button>
            <Button variant={feedFilter === "paid_users" ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1" onClick={() => setFeedFilter("paid_users")}>
              <CreditCard className="h-3 w-3 text-emerald-500" /> Paid Users ({paidStoresList.length})
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {(feedFilter === "all" || feedFilter === "new_users") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <UserPlus className="h-4 w-4 text-blue-500" /> Newly Registered Users
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                    {newUsersList.length} Total Users
                  </Badge>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {newUsersList.map(u => (
                    <div key={u.id} className="p-3 border border-muted-foreground/10 rounded-lg hover:bg-muted/20 transition-all flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{u.name}</span>
                          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/10 text-[9px] uppercase font-bold py-0">{u.role}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                        <span className="text-[10px] text-muted-foreground block font-medium">Branch: {u.storeName} • Joined {u.joinedDate}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[11px] h-7 text-primary hover:bg-primary/10 gap-1 font-bold"
                        onClick={() => {
                          setTargetAudience("user");
                          setTargetUserId(u.id);
                          setBroadcastTitle(`Welcome to Stackwise, ${u.name}!`);
                          setBroadcastMessage(`Hello ${u.name}, welcome aboard to ${u.storeName}. If you need any assistance setting up your terminal, please reply or reach out.`);
                          toast.info(`Pre-filled notification target for ${u.name}`);
                        }}>
                        <Send className="h-3 w-3" /> Direct Alert
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(feedFilter === "all" || feedFilter === "paid_users") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <CreditCard className="h-4 w-4 text-emerald-500" /> Paid Stores & Subscriptions
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                    {paidStoresList.length} Active Paid Tenants
                  </Badge>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {paidStoresList.map(s => (
                    <div key={s.id} className="p-3 border border-muted-foreground/10 rounded-lg hover:bg-muted/20 transition-all flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{s.name}</span>
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/10 text-[9px] uppercase font-bold py-0">Active Paid</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Manager: {s.manager} ({s.managerEmail})</p>
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Valuation: ₦{s.valuationNgn.toLocaleString()} • Health Score {s.healthScore}%
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[11px] h-7 text-emerald-600 hover:bg-emerald-500/10 gap-1 font-bold"
                        onClick={() => {
                          setTargetAudience("store");
                          setTargetStoreId(s.id);
                          setBroadcastTitle(`Special Merchant Offer for ${s.name}`);
                          setBroadcastMessage(`Dear ${s.manager}, thank you for being a valued subscriber of ${s.name}. We have unlocked advanced AI Analytics for your branch.`);
                          toast.info(`Pre-filled notification target for ${s.name}`);
                        }}>
                        <Send className="h-3 w-3" /> Direct Alert
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader className="bg-muted/15 border-b border-muted-foreground/10 pb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <ShieldAlert className="h-5.5 w-5.5 text-red-500 animate-pulse" /> Core System Feature Locks
              </CardTitle>
              <CardDescription className="text-xs max-w-2xl">
                Block access to core modules across all branch environments in real-time.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-center bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-semibold uppercase font-sans tracking-wide">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Root Live Control
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-muted-foreground/10">
          {systemFeatures.map((feature) => {
            const isLocked = lockedFeatures.includes(feature.id);
            return (
              <div key={feature.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-all">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-sans">{feature.label}</span>
                    {isLocked ? (
                      <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/20 font-bold border-red-500/10 text-[10px] uppercase py-0.5 tracking-wider">Locked</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 font-bold border-emerald-500/10 text-[10px] uppercase py-0.5 tracking-wider">Operational</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isLocked ? (
                    <Button onClick={() => toggleFeatureLock(feature.id, feature.label)} variant="outline" size="sm"
                      className="text-xs font-bold border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 h-9 gap-1.5 shadow-sm">
                      <Unlock className="h-3.5 w-3.5" /> Unlock Feature
                    </Button>
                  ) : (
                    <Button onClick={() => toggleFeatureLock(feature.id, feature.label)} variant="destructive" size="sm"
                      className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white h-9 gap-1.5 shadow-sm">
                      <Lock className="h-3.5 w-3.5" /> Lock & Notify
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-none border border-muted-foreground/10">
          <form onSubmit={handleSaveConfig}>
            <CardHeader>
              <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" /> WhatsApp API Hub Config
              </CardTitle>
              <CardDescription>Setup notification templates, webhooks and toggles for automated dispatch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-muted-foreground/10 rounded-lg hover:bg-muted/10 transition-all">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold block">POS Sales Receipts</span>
                  <span className="text-[10px] text-muted-foreground block">Dispatch transaction receipts instantly after checkout.</span>
                </div>
                <button type="button" onClick={handleToggleReceipts} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsapp.enabledReceipts ? 'bg-emerald-500' : 'bg-muted'}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsapp.enabledReceipts ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 border border-muted-foreground/10 rounded-lg hover:bg-muted/10 transition-all">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold block">Automatic Reorder Warnings</span>
                  <span className="text-[10px] text-muted-foreground block">Ping warehouse contacts when inventory crosses low threshold.</span>
                </div>
                <button type="button" onClick={handleToggleAlerts} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsapp.enabledAlerts ? 'bg-emerald-500' : 'bg-muted'}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsapp.enabledAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-prefix" className="text-xs font-semibold">Standard Phone Code Prefix</Label>
                <Input id="default-prefix" value={whatsapp.defaultPrefix} onChange={e => setWhatsapp(prev => ({ ...prev, defaultPrefix: e.target.value }))} className="text-xs font-mono h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="webhook-url" className="text-xs font-semibold">Webhook Gateway Endpoint</Label>
                <div className="flex items-center gap-2">
                  <Input id="webhook-url" value={whatsapp.webhookUrl} onChange={e => setWhatsapp(prev => ({ ...prev, webhookUrl: e.target.value }))} className="text-xs font-mono h-9 flex-1" />
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1.5 h-9 font-bold uppercase select-none">ACTIVE</Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="msg-template" className="text-xs font-semibold">Automatic Checkout Message Template</Label>
                <textarea id="msg-template" value={whatsapp.defaultTemplate} onChange={e => setWhatsapp(prev => ({ ...prev, defaultTemplate: e.target.value }))} className="w-full text-xs font-sans p-3 border border-input rounded-md bg-background focus:outline-none min-h-[80px]" />
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Supports handlebars tags: <code>{"{{"}customer_name{"}}"}</code>, <code>{"{{"}amount{"}}"}</code>, <code>{"{{"}store_name{"}}"}</code>
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="text-xs h-9 font-semibold bg-primary hover:bg-primary/95 text-white w-full sm:w-auto">
                Save Hub Configuration
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-500" /> Webhook Payload Dispatcher
              </CardTitle>
              <CardDescription>Bypass automation and fire custom payloads directly to a WhatsApp terminal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="test-phone" className="text-xs font-semibold">Destination Phone Number</Label>
                <Input id="test-phone" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="e.g. 08123456789 or +234..." className="text-xs font-mono h-9" />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Numbers will be sanitized and appended with the default prefix if needed.</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test-message" className="text-xs font-semibold">Custom Test Dispatch Message</Label>
                <textarea id="test-message" value={testMsg} onChange={e => setTestMsg(e.target.value)} className="w-full text-xs p-3 border border-input rounded-md bg-background focus:outline-none min-h-[120px]" />
              </div>
            </CardContent>
          </div>
          <CardFooter className="pt-4 border-t border-muted-foreground/10 flex justify-between items-center bg-muted/25 p-5">
            <div className="text-[10px] text-muted-foreground max-w-[60%] font-medium">
              Opens standard WhatsApp click-to-chat web wrapper safely.
            </div>
            <Button onClick={handleDispatchTest} className="text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
              Test Dispatch <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
