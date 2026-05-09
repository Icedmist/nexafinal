import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Lock, 
  User, 
  Building,
  Globe,
  Loader2
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvitePlatformUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Role = "owner" | "system_admin";

export function InvitePlatformUserDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: InvitePlatformUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("owner");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    storeName: "",
    storeSlug: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const provision = httpsCallable(functions, 'provisionplatformuser');
      await provision({
        ...formData,
        role
      });

      toast.success(`${role === "owner" ? "Store Owner" : "System Admin"} provisioned successfully.`);
      onOpenChange(false);
      setFormData({
        email: "",
        password: "",
        displayName: "",
        storeName: "",
        storeSlug: ""
      });
      onSuccess?.();
    } catch (error: any) {
      console.error("Provisioning error:", error);
      toast.error(error.message || "Failed to provision user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-slate-200 overflow-hidden p-0">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-8">
              <div className="bg-blue-600/10 w-fit p-3 rounded-2xl mb-4 ring-1 ring-blue-600/20">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-white uppercase italic">
                Platform Access
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Onboard new identities to the Nexa ecosystem.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("owner")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center group",
                    role === "owner" 
                      ? "bg-blue-600/10 border-blue-600 text-blue-400 shadow-lg shadow-blue-900/10" 
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                  )}
                >
                  <ShieldCheck className={cn("h-5 w-5", role === "owner" ? "text-blue-400" : "text-slate-600")} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Store Owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("system_admin")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center group",
                    role === "system_admin" 
                      ? "bg-amber-600/10 border-amber-600 text-amber-400 shadow-lg shadow-amber-900/10" 
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                  )}
                >
                  <ShieldAlert className={cn("h-5 w-5", role === "system_admin" ? "text-amber-400" : "text-slate-600")} />
                  <span className="text-[10px] font-black uppercase tracking-widest">System Admin</span>
                </button>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    required
                    placeholder="Full Name"
                    className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    required
                    type="email"
                    placeholder="Email Address"
                    className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    required
                    type="password"
                    placeholder="Initial Password"
                    className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              {/* Store Info (Only for Owner) */}
              {role === "owner" && (
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Business Provisioning</span>
                  </div>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <input
                      required
                      placeholder="Store Name"
                      className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">SLUG:</div>
                    <input
                      required
                      placeholder="business-slug"
                      className="w-full rounded-2xl bg-slate-900 border border-slate-800 py-3 pl-14 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                      value={formData.storeSlug}
                      onChange={(e) => setFormData({ ...formData, storeSlug: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="bg-slate-900/50 p-6 flex flex-row items-center justify-between gap-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
            >
              Abort
            </button>
            <button
              disabled={loading}
              type="submit"
              className={cn(
                "flex items-center gap-2 rounded-xl px-8 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:shadow-xl",
                role === "owner" ? "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20" : "bg-amber-600 hover:bg-amber-700 hover:shadow-amber-500/20"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Finalize Identity"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
