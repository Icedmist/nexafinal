import { useState, useCallback, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/contexts/BusinessContext";
import { useRole } from "@/hooks/useRole";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Eye,
  Download,
  ShieldCheck,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface UserManualState {
  userManualTitle: string;
  userManualVersion: string;
  userManualDescription: string;
  userManualUrl: string;
  userManualUpdatedAt?: string;
}

const DEFAULT_MANUAL: UserManualState = {
  userManualTitle: "NexaOS Multi-Branch Merchant Operations Manual",
  userManualVersion: "v3.2 Official",
  userManualDescription:
    "Standard Operating Procedures for branch managers, inventory transfers, stock movements with debt tracking, cashier POS, and audit logs.",
  userManualUrl: "https://www.w3.org/W3C/DesignIssues/diagrams/overview.pdf",
  userManualUpdatedAt: "2026-07-29",
};

const STORAGE_KEY = "nexa_user_manual_settings";

function useUserManual() {
  const { storeId } = useBusiness();
  const [settings, setSettings] = useState<UserManualState>(DEFAULT_MANUAL);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setSettings((prev) => ({ ...prev, ...JSON.parse(cached) }));
      } catch {
        /* ignore corrupt cache */
      }
    }

    if (!storeId) return;
    const settingsRef = doc(db, "stores", storeId);
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const next: UserManualState = {
          userManualTitle: data.userManualTitle || DEFAULT_MANUAL.userManualTitle,
          userManualVersion: data.userManualVersion || DEFAULT_MANUAL.userManualVersion,
          userManualDescription: data.userManualDescription || DEFAULT_MANUAL.userManualDescription,
          userManualUrl: data.userManualUrl || DEFAULT_MANUAL.userManualUrl,
          userManualUpdatedAt: data.userManualUpdatedAt || DEFAULT_MANUAL.userManualUpdatedAt,
        };
        setSettings(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      (error) => console.warn("Failed to load user manual settings:", error),
    );
    return () => unsub();
  }, [storeId]);

  const updateSettings = useCallback(
    async (updates: Partial<UserManualState>) => {
      const next = { ...settings, ...updates };
      setSettings(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (storeId) {
        await setDoc(doc(db, "stores", storeId), { ...updates }, { merge: true });
      }
    },
    [settings, storeId],
  );

  return { settings, updateSettings };
}

export function UserManualSection() {
  const { settings, updateSettings } = useUserManual();
  const { isSystemAdmin } = useRole();

  const [readerOpen, setReaderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Super Admin upload
  const [manualTitle, setManualTitle] = useState(
    settings.userManualTitle || "NexaOS Multi-Branch Merchant Operations Manual"
  );
  const [manualVersion, setManualVersion] = useState(
    settings.userManualVersion || "v3.2 Official"
  );
  const [manualDescription, setManualDescription] = useState(
    settings.userManualDescription ||
      "Standard Operating Procedures for branch managers, inventory transfers, stock movements with debt tracking, cashier POS, and audit logs."
  );
  const [manualUrl, setManualUrl] = useState(
    settings.userManualUrl || "https://www.w3.org/W3C/DesignIssues/diagrams/overview.pdf"
  );
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a valid PDF document (.pdf)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit. Please upload a smaller PDF or supply a URL.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setManualUrl(result);
        toast.success(`PDF "${file.name}" ready for upload!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManual = async () => {
    if (!manualTitle.trim()) {
      toast.error("Please provide a title for the manual");
      return;
    }

    try {
      setIsSaving(true);
      const todayStr = new Date().toISOString().split("T")[0];
      await updateSettings({
        userManualTitle: manualTitle,
        userManualVersion: manualVersion,
        userManualDescription: manualDescription,
        userManualUrl: manualUrl,
        userManualUpdatedAt: todayStr,
      });

      toast.success("System PDF User Manual updated & synced to all merchants!");
      setUploadOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update PDF user manual");
    } finally {
      setIsSaving(false);
    }
  };

  const currentTitle = settings.userManualTitle || "NexaOS Multi-Branch Merchant Operations Manual";
  const currentVersion = settings.userManualVersion || "v3.2 Official";
  const currentDesc =
    settings.userManualDescription ||
    "Standard Operating Procedures for branch managers, inventory transfers, stock movements with debt tracking, cashier POS, and audit logs.";
  const currentUrl =
    settings.userManualUrl || "https://www.w3.org/W3C/DesignIssues/diagrams/overview.pdf";
  const currentUpdated = settings.userManualUpdatedAt || new Date().toISOString().split("T")[0];

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden">
      <CardHeader className="border-b border-primary/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase">
                <FileText className="h-3 w-3 mr-1" /> Official User Manual
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-bold">
                {currentVersion}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground">Updated: {currentUpdated}</span>
            </div>

            <CardTitle className="text-lg font-bold font-sans text-foreground flex items-center gap-2">
              {currentTitle}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {currentDesc}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              className="text-xs h-9 font-bold bg-primary hover:bg-primary/95 text-primary-foreground gap-2 shadow-sm"
              onClick={() => setReaderOpen(true)}
            >
              <Eye className="h-4 w-4" /> Read PDF Manual
            </Button>

            {isSystemAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-3.5 w-3.5 text-amber-500" /> Upload / Update PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3 px-6 bg-card/60 text-xs flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Verified Super Admin Documentation
          </span>
          <span>•</span>
          <span className="text-[11px]">PDF Interactive Viewer Enabled</span>
        </div>

        <span className="text-[11px] italic">
          Super Admins can upload updated PDF manuals anytime to sync live across all store locations.
        </span>
      </CardContent>

      {/* READ PDF MANUAL MODAL */}
      <Dialog open={readerOpen} onOpenChange={setReaderOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] bg-card border border-border p-0 flex flex-col overflow-hidden shadow-2xl">
          {/* Reader Topbar */}
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  {currentTitle}
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    {currentVersion}
                  </Badge>
                </h3>
                <p className="text-[11px] text-muted-foreground">Official System Operating Manual for Merchants & Staff</p>
              </div>
            </div>

            {/* Reader Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Zoom Out"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono px-1 min-w-[40px] text-center">{zoomLevel}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Zoom In"
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 font-semibold gap-1.5"
                onClick={() => window.open(currentUrl, "_blank", "noopener,noreferrer")}
              >
                <Download className="h-3.5 w-3.5 text-primary" /> Download PDF
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setReaderOpen(false)}
              >
                ✕
              </Button>
            </div>
          </div>

          {/* PDF Viewer Body */}
          <div className="flex-1 bg-muted/40 p-4 overflow-auto flex items-center justify-center relative">
            {currentUrl ? (
              <div
                className="w-full h-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden border border-border flex flex-col"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              >
                <iframe
                  src={`${currentUrl}#toolbar=1`}
                  className="w-full h-full min-h-[550px] border-none"
                  title="PDF User Manual"
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-card rounded-2xl border border-border space-y-3">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold">No PDF document loaded</p>
                <p className="text-xs text-muted-foreground">Super Admin can upload a PDF user manual in the settings.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SUPER ADMIN UPLOAD PDF MODAL */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg bg-card border border-border p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Upload className="h-5 w-5 text-amber-500" />
              Upload / Update System PDF User Manual
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload an updated PDF manual or set a custom document link. This will instantly reflect across all enterprise branches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* File Upload Dropzone */}
            <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center space-y-2">
              <Upload className="h-8 w-8 text-primary mx-auto animate-bounce" />
              <div>
                <p className="font-bold text-foreground">Select PDF File from your Device</p>
                <p className="text-[11px] text-muted-foreground">Supported format: PDF (.pdf), up to 10MB</p>
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 font-bold border-primary text-primary"
                onClick={() => document.getElementById("pdf-upload-input")?.click()}
              >
                Choose PDF File
              </Button>
              {fileName && (
                <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Selected: {fileName}
                </p>
              )}
            </div>

            {/* Manual Title */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Manual Title *</Label>
              <Input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Enterprise Merchant Operations Manual"
                className="h-9 text-xs"
              />
            </div>

            {/* Version Tag */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Version Tag</Label>
              <Input
                value={manualVersion}
                onChange={(e) => setManualVersion(e.target.value)}
                placeholder="e.g. v3.2 Official"
                className="h-9 text-xs"
              />
            </div>

            {/* Manual URL / Data URL */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">PDF Document Link / Data URL</Label>
              <Input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/manual.pdf or base64"
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Description Summary</Label>
              <Textarea
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Brief summary of what this operating manual covers..."
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveManual}
              disabled={isSaving}
              className="text-xs h-9 font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
              {isSaving ? "Saving..." : "Save & Sync to All Merchants"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
