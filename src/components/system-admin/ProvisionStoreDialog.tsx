import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Building2, Globe, User, Phone, MapPin, Hash } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface ProvisionStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProvisionStoreDialog({ open, onOpenChange, onSuccess }: ProvisionStoreDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    businessType: "retail",
    phone: "",
    address: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.slug) {
        throw new Error("Store name and slug are required.");
      }

      // Check slug uniqueness
      const slugQuery = query(collection(db, "stores"), where("slug", "==", formData.slug));
      const slugSnap = await getDocs(slugQuery);
      if (!slugSnap.empty) {
        throw new Error(`Slug "${formData.slug}" is already taken. Choose a different one.`);
      }

      await addDoc(collection(db, "stores"), {
        ...formData,
        status: "active",
        setupComplete: false,
        subscriptionTier: "starter",
        subscriptionStatus: "trial",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Store provisioned successfully!");
      onOpenChange(false);
      onSuccess?.();
      setFormData({
        name: "",
        slug: "",
        ownerEmail: "",
        businessType: "retail",
        phone: "",
        address: ""
      });
    } catch (error: any) {
      console.error("Error provisioning store:", error);
      toast.error(error.message || "Failed to provision store.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white p-0 overflow-hidden rounded-3xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Provision Store</DialogTitle>
              <DialogDescription className="text-slate-400">
                Instantly deploy a new organization environment on the Nexa platform.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Building2 className="h-3 w-3" /> Entity Name
                </label>
                <input
                  required
                  placeholder="e.g. Nexa Retail Gombe"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Globe className="h-3 w-3" /> Subdomain Slug
                </label>
                <div className="relative">
                  <input
                    required
                    placeholder="nexa-retail-gombe"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all pr-24"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
                    .nexa.os
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <User className="h-3 w-3" /> Owner Email
                  </label>
                  <input
                    type="email"
                    placeholder="owner@email.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Hash className="h-3 w-3" /> Business Type
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                    value={formData.businessType}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                  >
                    <option value="retail">Retail</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="agriculture">Agriculture</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="electronics">Electronics</option>
                    <option value="social_commerce">Social Commerce</option>
                    <option value="textile">Textile</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Contact Phone
                  </label>
                  <input
                    placeholder="+234..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Address
                  </label>
                  <input
                    placeholder="City, State"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-900/50 p-6 gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-6 py-3 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 px-6 py-3 rounded-xl text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? "Provisioning..." : "Deploy Store"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
