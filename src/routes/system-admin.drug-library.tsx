import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Pill, CheckCircle2, XCircle, Clock, Search, ShieldCheck, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { type DrugLibraryItem, DRUG_LIBRARY } from "@/data/drugLibrary";

async function seedDrugLibrary(): Promise<DrugLibraryItem[]> {
  const seeded: DrugLibraryItem[] = [];
  for (const item of DRUG_LIBRARY) {
    const docRef = await addDoc(collection(db, "drugLibrary"), {
      ...item,
      createdAt: new Date().toISOString(),
    });
    seeded.push({ ...item, id: docRef.id });
  }
  return seeded;
}

export default function DrugLibraryAdminPage() {
  const [items, setItems] = useState<DrugLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending_review" | "verified" | "rejected">("pending_review");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDrug, setNewDrug] = useState({
    name: "",
    genericName: "",
    strength: "",
    category: "Analgesics & Pain Relief",
    dosageForm: "Tablet",
    isPrescriptionOnly: false,
    description: "",
    manufacturer: "NAFDAC Master Registry",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateMasterDrug = async () => {
    if (!newDrug.name.trim()) {
      toast.error("Drug brand/trade name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "drugLibrary"), {
        name: newDrug.name.trim(),
        genericName: newDrug.genericName.trim() || newDrug.name.trim(),
        strength: newDrug.strength.trim() || "Standard",
        category: newDrug.category,
        dosageForm: newDrug.dosageForm,
        isPrescriptionOnly: newDrug.isPrescriptionOnly,
        requiresPrescription: newDrug.isPrescriptionOnly,
        description: newDrug.description.trim() || `${newDrug.name} (${newDrug.genericName || newDrug.name}) - NAFDAC Master Drug.`,
        manufacturer: newDrug.manufacturer.trim() || "NAFDAC Master Registry",
        verificationStatus: "verified",
        source: "nafdac_seed_v2",
        createdAt: new Date().toISOString(),
      });

      toast.success(`Master Drug "${newDrug.name}" added and verified!`);
      setIsAddOpen(false);
      setNewDrug({
        name: "",
        genericName: "",
        strength: "",
        category: "Analgesics & Pain Relief",
        dosageForm: "Tablet",
        isPrescriptionOnly: false,
        description: "",
        manufacturer: "NAFDAC Master Registry",
      });
    } catch (err) {
      console.error("Failed to add master drug:", err);
      toast.error("Failed to create master drug record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "drugLibrary"),
      async (snap) => {
        if (snap.empty) {
          const seeded = await seedDrugLibrary();
          setItems(seeded);
          setLoading(false);
          return;
        }

        const list: DrugLibraryItem[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data() as DrugLibraryItem;
          list.push({
            ...d,
            id: docSnap.id,
            requiresPrescription: d.isPrescriptionOnly ?? d.requiresPrescription ?? false,
            verificationStatus: d.verificationStatus || "verified"
          });
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching drugLibrary in Super Admin:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    try {
      await updateDoc(doc(db, "drugLibrary", id), {
        verificationStatus: "verified",
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Approved "${name}" into global NAFDAC/WHO drug library!`);
    } catch (err) {
      console.error("Failed to approve drug:", err);
      toast.error("Failed to approve drug item.");
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await updateDoc(doc(db, "drugLibrary", id), {
        verificationStatus: "rejected",
        updatedAt: new Date().toISOString(),
      });
      toast.error(`Rejected "${name}" submission.`);
    } catch (err) {
      console.error("Failed to reject drug:", err);
      toast.error("Failed to reject drug item.");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.genericName && item.genericName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && item.verificationStatus === statusFilter;
  });

  const pendingCount = items.filter((i) => i.verificationStatus === "pending_review").length;
  const verifiedCount = items.filter((i) => i.verificationStatus === "verified").length;
  const rejectedCount = items.filter((i) => i.verificationStatus === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-slate-900 text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-teal-400" />
            <h2 className="text-xl font-bold tracking-tight">Drug Library & Custom Review Queue</h2>
          </div>
          <p className="text-xs text-slate-300">
            Super Admin moderation queue for pharmacy merchant custom drug submissions and NAFDAC/WHO master library records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsAddOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs h-8 gap-1 px-3">
            <PlusCircle className="h-3.5 w-3.5" /> Add Master Drug
          </Button>
          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 font-mono text-xs">
            {pendingCount} Pending Review
          </Badge>
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 font-mono text-xs">
            {verifiedCount} Verified Master Drugs
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase">Pending Submissions</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Verified Library</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{verifiedCount}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase">Rejected Submissions</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{rejectedCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-rose-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border border-muted-foreground/15">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search drug name, ingredient, or category..." className="pl-9 h-9 text-xs" />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "pending_review", label: `Pending (${pendingCount})` },
                { id: "verified", label: `Verified (${verifiedCount})` },
                { id: "rejected", label: `Rejected (${rejectedCount})` },
                { id: "all", label: `All (${items.length})` },
              ].map((tab) => (
                <Button key={tab.id} variant={statusFilter === tab.id ? "default" : "outline"} size="sm"
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)} className="h-8 text-xs rounded-xl">
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading drug library entries...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Pill className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p>No drug items found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 border rounded-xl overflow-hidden bg-background">
              {filteredItems.map((item, idx) => (
                <div key={`${item.id || item.name}-${idx}`}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-accent/10 transition-colors">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
                      {item.strength && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">{item.strength}</span>
                      )}
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.isPrescriptionOnly || item.requiresPrescription
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                          : "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                      }`}>
                        {item.isPrescriptionOnly || item.requiresPrescription ? "POM (Rx)" : "OTC"}
                      </span>
                      {item.verificationStatus === "pending_review" && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Pending Review</span>
                      )}
                      {item.verificationStatus === "verified" && (
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Verified</span>
                      )}
                      {item.verificationStatus === "rejected" && (
                        <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Rejected</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description || "No description provided."}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-mono pt-1">
                      <span>Category: <strong className="text-foreground">{item.category}</strong></span>
                      <span>Form: <strong className="text-foreground">{item.dosageForm}</strong></span>
                      <span>Active: <strong className="text-foreground">{item.genericName}</strong></span>
                      <span>Source: <strong className="text-foreground">{item.source || "nafdac_seed_v2"}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.verificationStatus === "pending_review" && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(item.id!, item.name)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReject(item.id!, item.name)}
                          className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 font-semibold gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {item.verificationStatus === "rejected" && (
                      <Button variant="outline" size="sm" onClick={() => handleApprove(item.id!, item.name)}
                        className="h-8 text-xs font-semibold gap-1">Re-Approve</Button>
                    )}
                    {item.verificationStatus === "verified" && (
                      <Button variant="ghost" size="sm" onClick={() => handleReject(item.id!, item.name)}
                        className="h-8 text-xs text-muted-foreground hover:text-rose-600">Un-verify</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Pill className="h-5 w-5 text-teal-600" /> Add Master NAFDAC/WHO Drug Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              Directly inject a verified, pre-approved pharmaceutical product into the global drug library for all merchants.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Trade / Brand Name *</label>
                <Input value={newDrug.name} onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                  placeholder="e.g. Coartem 80/480mg" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Generic / Active Ingredient</label>
                <Input value={newDrug.genericName} onChange={(e) => setNewDrug({ ...newDrug, genericName: e.target.value })}
                  placeholder="e.g. Artemether + Lumefantrine" className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Strength</label>
                <Input value={newDrug.strength} onChange={(e) => setNewDrug({ ...newDrug, strength: e.target.value })}
                  placeholder="e.g. 80/480mg" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Dosage Form</label>
                <Select value={newDrug.dosageForm} onValueChange={(val) => setNewDrug({ ...newDrug, dosageForm: val })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Capsule">Capsule</SelectItem>
                    <SelectItem value="Syrup / Suspension">Syrup / Suspension</SelectItem>
                    <SelectItem value="Injectable">Injectable</SelectItem>
                    <SelectItem value="Cream / Ointment">Cream / Ointment</SelectItem>
                    <SelectItem value="Eye / Ear Drops">Eye / Ear Drops</SelectItem>
                    <SelectItem value="Infusion / IV">Infusion / IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Prescription Status</label>
                <Select value={newDrug.isPrescriptionOnly ? "rx" : "otc"} onValueChange={(val) => setNewDrug({ ...newDrug, isPrescriptionOnly: val === "rx" })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="otc">Over-The-Counter (OTC)</SelectItem>
                    <SelectItem value="rx">Prescription-Only (POM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Therapeutic Category</label>
              <Select value={newDrug.category} onValueChange={(val) => setNewDrug({ ...newDrug, category: val })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Analgesics & Pain Relief">Analgesics & Pain Relief</SelectItem>
                  <SelectItem value="Antibiotics & Anti-Infectives">Antibiotics & Anti-Infectives</SelectItem>
                  <SelectItem value="Antimalarials">Antimalarials</SelectItem>
                  <SelectItem value="Cardiovascular & Hypertension">Cardiovascular & Hypertension</SelectItem>
                  <SelectItem value="Antidiabetics & Endocrine">Antidiabetics & Endocrine</SelectItem>
                  <SelectItem value="Gastrointestinal & Ulcer">Gastrointestinal & Ulcer</SelectItem>
                  <SelectItem value="Cough, Cold & Respiratory">Cough, Cold & Respiratory</SelectItem>
                  <SelectItem value="Vitamins & Food Supplements">Vitamins & Food Supplements</SelectItem>
                  <SelectItem value="Dermatologicals">Dermatologicals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Clinical Indications / Usage Description</label>
              <Input value={newDrug.description} onChange={(e) => setNewDrug({ ...newDrug, description: e.target.value })}
                placeholder="Indication, usage notes or clinical summary..." className="h-8 text-xs" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleCreateMasterDrug} disabled={isSubmitting}
              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
              {isSubmitting ? "Adding..." : "Add to Verified Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
