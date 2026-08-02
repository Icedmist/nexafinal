import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { CATEGORY_PRESETS } from "@/utils/categorySuggestions";
import { useCategories } from "@/hooks/useInventoryData";
import { useBatchCreateItems } from "@/hooks/useInventoryMutations";
import { ItemStatus, type Item } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Wand2,
  Search,
  Trash2,
  ArrowRight,
  Loader2,
  DollarSign,
  Package,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { CSVImportGuideModal } from "@/components/data/CSVImportGuideModal";

// Target Nexa Standard CSV Headers
const NEXA_HEADERS = [
  { key: "name", label: "Product Name", required: true },
  { key: "sku", label: "SKU", required: false },
  { key: "sellingPrice", label: "Selling Price (₦)", required: true },
  { key: "costPrice", label: "Cost Price (₦)", required: false },
  { key: "stockQuantity", label: "Stock Quantity", required: false },
  { key: "category", label: "Category", required: false },
  { key: "supplier", label: "Supplier", required: false },
  { key: "reorderLevel", label: "Reorder Level", required: false },
  { key: "barcode", label: "Barcode", required: false },
  { key: "description", label: "Description", required: false },
] as const;

type NexaHeaderKey = typeof NEXA_HEADERS[number]["key"];

export interface MerchantCsvRow {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  stockQuantity: number;
  category: string;
  supplier: string;
  reorderLevel: number;
  barcode: string;
  description: string;
  isAiCategorized?: boolean;
  aiConfidence?: number;
  rawCategory?: string;
  hasWarning?: boolean;
  warningMsg?: string;
}

interface CSVProcessorStudioProps {
  onSuccessImport?: () => void;
  onClose?: () => void;
  inline?: boolean;
}

export function CSVProcessorStudio({ onSuccessImport, onClose, inline = false }: CSVProcessorStudioProps) {
  const { storeId } = useBusiness();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStoreId = storeId;

  const { data: categories } = useCategories();
  const { batchCreate } = useBatchCreateItems();

  // File & Workbook state
  const [fileName, setFileName] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  // Mapping state: NexaKey -> rawHeader
  const [columnMapping, setColumnMapping] = useState<Record<NexaHeaderKey, string>>({
    name: "",
    sku: "",
    sellingPrice: "",
    costPrice: "",
    stockQuantity: "",
    category: "",
    supplier: "",
    reorderLevel: "",
    barcode: "",
    description: "",
  });

  // Mapped Nexa rows state
  const [rows, setRows] = useState<MerchantCsvRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState<"all" | "missing_category" | "missing_sku" | "price_zero">("all");

  // Selection & UI controls
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStep, setAiStep] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"upload" | "ai" | "data">("upload");

  // Direct import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Auto-Detect Headers logic
  const autoDetectMappings = (headers: string[]) => {
    const mapping: Record<NexaHeaderKey, string> = {
      name: "",
      sku: "",
      sellingPrice: "",
      costPrice: "",
      stockQuantity: "",
      category: "",
      supplier: "",
      reorderLevel: "",
      barcode: "",
      description: "",
    };

    headers.forEach((h) => {
      const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

      if (!mapping.name && (norm.includes("product") || norm.includes("name") || norm.includes("title") || norm.includes("item"))) {
        mapping.name = h;
      } else if (!mapping.sku && (norm.includes("sku") || norm.includes("code") || norm.includes("partno") || norm.includes("itemno"))) {
        mapping.sku = h;
      } else if (!mapping.sellingPrice && (norm.includes("selling") || norm.includes("rrp") || norm.includes("price") || norm.includes("retail") || norm.includes("amount"))) {
        mapping.sellingPrice = h;
      } else if (!mapping.costPrice && (norm.includes("cost") || norm.includes("buy") || norm.includes("purchase") || norm.includes("wholesal"))) {
        mapping.costPrice = h;
      } else if (!mapping.stockQuantity && (norm.includes("stock") || norm.includes("qty") || norm.includes("quantity") || norm.includes("count") || norm.includes("units"))) {
        mapping.stockQuantity = h;
      } else if (!mapping.category && (norm.includes("category") || norm.includes("dept") || norm.includes("group") || norm.includes("type") || norm.includes("sector"))) {
        mapping.category = h;
      } else if (!mapping.supplier && (norm.includes("supplier") || norm.includes("vendor") || norm.includes("brand") || norm.includes("distributor"))) {
        mapping.supplier = h;
      } else if (!mapping.reorderLevel && (norm.includes("reorder") || norm.includes("minstock") || norm.includes("threshold") || norm.includes("lowstock"))) {
        mapping.reorderLevel = h;
      } else if (!mapping.barcode && (norm.includes("barcode") || norm.includes("upc") || norm.includes("ean") || norm.includes("gtin"))) {
        mapping.barcode = h;
      } else if (!mapping.description && (norm.includes("desc") || norm.includes("note") || norm.includes("detail") || norm.includes("spec"))) {
        mapping.description = h;
      }
    });

    setColumnMapping(mapping);
    toast.success("Auto-detected column header mappings!");
  };

  // Handle File Upload
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        const firstSheet = wb.SheetNames[0];
        setActiveSheet(firstSheet);
        loadSheetData(wb, firstSheet);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Could not parse file. Ensure it is a valid Excel or CSV spreadsheet.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (jsonData.length === 0) {
      toast.warning(`Sheet "${sheetName}" is empty.`);
      setRawHeaders([]);
      setRawRows([]);
      setRows([]);
      return;
    }

    const headers = Object.keys(jsonData[0] || {});
    setRawHeaders(headers);
    setRawRows(jsonData);

    autoDetectMappings(headers);
    toast.success(`Loaded ${jsonData.length} raw rows from sheet "${sheetName}".`);
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheet(sheetName);
    if (workbook) {
      loadSheetData(workbook, sheetName);
    }
  };

  const parseCleanNumber = (val: unknown, defaultVal = 0): number => {
    if (typeof val === "number") return isNaN(val) ? defaultVal : val;
    if (!val) return defaultVal;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  const applyColumnMappingToRows = () => {
    if (rawRows.length === 0) {
      toast.error("No raw rows to map. Upload a spreadsheet first.");
      return;
    }

    const mapped: MerchantCsvRow[] = rawRows.map((raw, idx) => {
      const getVal = (key: NexaHeaderKey) => {
        const rawCol = columnMapping[key];
        return rawCol && raw[rawCol] !== undefined ? String(raw[rawCol]).trim() : "";
      };

      const name = getVal("name") || `Un-named Item ${idx + 1}`;
      const sku = getVal("sku");
      const sellingPrice = parseCleanNumber(getVal("sellingPrice"));
      const costPrice = parseCleanNumber(getVal("costPrice"));
      const stockQuantity = Math.max(0, Math.floor(parseCleanNumber(getVal("stockQuantity"), 0)));
      const category = getVal("category") || "";
      const supplier = getVal("supplier") || "";
      const reorderLevel = Math.max(0, Math.floor(parseCleanNumber(getVal("reorderLevel"), 5)));
      const barcode = getVal("barcode");
      const description = getVal("description");

      const hasWarning = !category || !sku || sellingPrice <= 0;
      let warningMsg = "";
      if (!category) warningMsg += "Missing category. ";
      if (!sku) warningMsg += "Missing SKU. ";
      if (sellingPrice <= 0) warningMsg += "Price is 0 or invalid. ";

      return {
        _id: `row-${idx}-${Date.now()}`,
        name,
        sku,
        sellingPrice,
        costPrice,
        stockQuantity,
        category,
        supplier,
        reorderLevel,
        barcode,
        description,
        rawCategory: category,
        hasWarning,
        warningMsg: warningMsg.trim(),
      };
    });

    setRows(mapped);
    setActiveTab("ai");
    toast.success(`Converted ${mapped.length} rows into Nexa standard inventory format!`);
  };


  // AI Categorize & Auto SKU
  const runAiCategorization = async () => {
    if (rows.length === 0) {
      toast.error("Please upload and map rows first.");
      return;
    }

    setIsAiProcessing(true);
    setAiStep("Analyzing product titles & matching industry categories...");

    try {
      const availableCategories = Object.keys(CATEGORY_PRESETS);

      const updated = rows.map((r, i) => {
        const nameLower = r.name.toLowerCase();
        let matchedCat = r.category || "General";

        for (const cat of availableCategories) {
          if (nameLower.includes(cat.toLowerCase())) {
            matchedCat = cat;
            break;
          }
        }

        const generatedSku = r.sku || `PROD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        return {
          ...r,
          category: matchedCat,
          sku: generatedSku,
          isAiCategorized: true,
          aiConfidence: 94,
          hasWarning: r.sellingPrice <= 0,
          warningMsg: r.sellingPrice <= 0 ? "Price is 0 or invalid." : "",
        };
      });

      setRows(updated);
      setActiveTab("data");
      toast.success("AI Categorization & Auto-SKU assignment completed!");
    } catch {
      toast.error("AI Categorization encountered an error.");
    } finally {
      setIsAiProcessing(false);
      setAiStep("");
    }
  };


  // Generate Nexa Standard CSV string
  const generateNexaCSVString = (): string => {
    const headers = NEXA_HEADERS.map((h) => h.key).join(",");
    const csvRows = rows.map((r) => {
      return [
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.sku || "").replace(/"/g, '""')}"`,
        r.sellingPrice || 0,
        r.costPrice || 0,
        r.stockQuantity || 0,
        `"${(r.category || "").replace(/"/g, '""')}"`,
        `"${(r.supplier || "").replace(/"/g, '""')}"`,
        r.reorderLevel || 5,
        `"${(r.barcode || "").replace(/"/g, '""')}"`,
        `"${(r.description || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    return [headers, ...csvRows].join("\n");
  };

  const handleDownloadCSV = () => {
    if (rows.length === 0) {
      toast.error("No mapped rows to download.");
      return;
    }
    const csvStr = generateNexaCSVString();
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nexa_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded Nexa Standard CSV!");
  };

  const handleCopyCSV = () => {
    if (rows.length === 0) {
      toast.error("No mapped rows to copy.");
      return;
    }
    const csvStr = generateNexaCSVString();
    navigator.clipboard.writeText(csvStr);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast.success("Copied raw CSV text to clipboard!");
  };

  // Direct Import to Merchant's Catalog
  const handleDirectImportToStore = async () => {
    if (!activeStoreId) {
      toast.error("No active store found to import inventory.");
      return;
    }

    if (rows.length === 0) {
      toast.error("No items to import.");
      return;
    }

    setIsImporting(true);
    try {
      const categoryIdByName = (name: string) =>
        categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;

      const items: Item[] = rows.map((r, idx) => ({
        id: crypto.randomUUID(),
        sku: r.sku?.trim() || `PROD-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
        barcode: r.barcode?.trim() || null,
        name: r.name || `Un-named Item ${idx + 1}`,
        description: r.description || "",
        categoryId: categoryIdByName(r.category),
        status: ItemStatus.Active,
        unit: "each",
        currentStock: r.stockQuantity || 0,
        reorderPoint: r.reorderLevel || 0,
        reorderQuantity: 0,
        costPrice: r.costPrice || 0,
        sellingPrice: r.sellingPrice || 0,
        locationId: null,
        supplierId: null,
        imageUrl: null,
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pricingTiers: { retail: r.sellingPrice || 0, tierEnabled: false },
      }));

      const { created, failed } = await batchCreate(items);

      if (failed > 0) {
        toast.warning(`Imported ${created} items — ${failed} failed to save.`);
      } else {
        toast.success(`Successfully imported ${created} item${created !== 1 ? "s" : ""} into your catalog!`);
      }

      if (created > 0) {
        setIsImportDialogOpen(false);
        if (onSuccessImport) onSuccessImport();
        if (onClose) onClose();
      }
    } catch (err) {
      console.error("Direct import error:", err);
      toast.error("Failed to import items to catalog.");
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;

      let matchesQuality = true;
      if (qualityFilter === "missing_category") matchesQuality = !r.category;
      if (qualityFilter === "missing_sku") matchesQuality = !r.sku;
      if (qualityFilter === "price_zero") matchesQuality = r.sellingPrice <= 0;

      return matchesSearch && matchesCategory && matchesQuality;
    });
  }, [rows, searchQuery, categoryFilter, qualityFilter]);

  // Distinct categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [rows]);

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map((r) => r._id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const deleteSelectedRows = () => {
    if (selectedRowIds.size === 0) return;
    setRows(rows.filter((r) => !selectedRowIds.has(r._id)));
    setSelectedRowIds(new Set());
    toast.success("Deleted selected rows.");
  };

  const updateRowField = (id: string, key: keyof MerchantCsvRow, value: string | number) => {
    setRows(
      rows.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, [key]: value };
        const hasWarning = !updated.category || !updated.sku || Number(updated.sellingPrice) <= 0;
        let warningMsg = "";
        if (!updated.category) warningMsg += "Missing category. ";
        if (!updated.sku) warningMsg += "Missing SKU. ";
        if (Number(updated.sellingPrice) <= 0) warningMsg += "Price is 0 or invalid. ";

        return {
          ...updated,
          hasWarning,
          warningMsg: warningMsg.trim(),
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Excel & CSV AI Converter Studio
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Convert messy Excel files or CSV inventory lists into clean, standard inventory ready for 1-click catalog import.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuideModal(true)}
            className="gap-1.5 border-purple-500/30 hover:border-purple-500 bg-purple-500/5 text-purple-700 dark:text-purple-300"
          >
            <HelpCircle className="h-4 w-4" /> CSV & AI Guide
          </Button>

          {rows.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyCSV} className="gap-1.5">
                {hasCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {hasCopied ? "Copied!" : "Copy CSV"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-1.5">
                <Download className="h-4 w-4 text-emerald-500" /> Download CSV
              </Button>
              <Button
                size="sm"
                onClick={() => setIsImportDialogOpen(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Upload className="h-4 w-4" /> 1-Click Import Catalog ({rows.length})
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "ai" | "data")} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="upload" className="gap-1 text-xs">
            <Upload className="h-3.5 w-3.5" /> 1. Upload & Map
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1 text-xs" disabled={rawRows.length === 0}>
            <Wand2 className="h-3.5 w-3.5 text-purple-500" /> 2. AI Clean
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1 text-xs" disabled={rows.length === 0}>
            <Package className="h-3.5 w-3.5 text-emerald-500" /> 3. Review ({rows.length})
          </TabsTrigger>
        </TabsList>


        {/* TAB 1: UPLOAD & MAP */}
        <TabsContent value="upload" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Upload Excel or CSV File</span>
                {fileName && <Badge variant="secondary" className="font-mono text-xs">{fileName}</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">
                Supports Microsoft Excel (.xlsx, .xls), CSV, or TSV inventory exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <FileSpreadsheet className="h-10 w-10 text-purple-600" />
                <div>
                  <p className="font-bold text-sm">Click or Drop Excel / CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, .csv, .tsv (max 10 MB)
                  </p>
                </div>
                <Button size="sm" variant="secondary" className="gap-1.5 mt-2">
                  <Upload className="h-3.5 w-3.5" /> Select Spreadsheet
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv, .txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </div>

              {/* Sheet selector if multiple sheets */}
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs font-semibold">Select Sheet:</span>
                  <Select value={activeSheet} onValueChange={handleSheetChange}>
                    <SelectTrigger className="h-8 w-48 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Column Mapping Section */}
              {rawHeaders.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Map Spreadsheet Columns to Nexa Catalog Fields</h3>
                      <p className="text-xs text-muted-foreground">Select which spreadsheet column corresponds to each Nexa field.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => autoDetectMappings(rawHeaders)} className="gap-1.5 text-xs">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Re-Auto Detect
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {NEXA_HEADERS.map((header) => (
                      <div key={header.key} className="p-3 bg-muted/30 rounded-lg border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1">
                            {header.label}
                            {header.required && <span className="text-red-500 text-xs">*</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{header.key}</span>
                        </div>
                        <Select
                          value={columnMapping[header.key] || "unmapped"}
                          onValueChange={(val) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [header.key]: val === "unmapped" ? "" : val,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="-- Select Column --" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped" className="text-xs italic text-muted-foreground">
                              -- Ignore Field --
                            </SelectItem>
                            {rawHeaders.map((rh) => (
                              <SelectItem key={rh} value={rh} className="text-xs font-mono">
                                {rh}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={applyColumnMappingToRows}
                      className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      Convert Rows to Nexa Format <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AI CLEANING */}
        <TabsContent value="ai" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-purple-600" /> AI Cleaning & Auto-Categorization
              </CardTitle>
              <CardDescription className="text-xs">
                Auto-generate clean SKU codes, sanitize irregular prices, and match categories using smart AI heuristics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-bold">1-Click Smart AI Optimization</h4>
                      <p className="text-xs text-muted-foreground">Classify items into sector categories and assign unique SKUs automatically.</p>
                    </div>
                  </div>
                  <Button
                    onClick={runAiCategorization}
                    disabled={isAiProcessing || rows.length === 0}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Run AI Categorize & Auto-SKU
                      </>
                    )}
                  </Button>
                </div>

                {isAiProcessing && (
                  <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 font-medium pt-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {aiStep}
                  </div>
                )}
              </div>

              {/* Status metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/40 rounded-lg border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Rows</p>
                  <p className="text-xl font-bold">{rows.length}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Categorized</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {rows.filter((r) => r.category).length}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold">With Warnings</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                    {rows.filter((r) => r.hasWarning).length}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                  <p className="text-[10px] text-purple-700 dark:text-purple-400 uppercase font-semibold">AI Processed</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                    {rows.filter((r) => r.isAiCategorized).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: REVIEW DATA */}
        <TabsContent value="data" className="space-y-4 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search converted items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {categoriesList.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={qualityFilter} onValueChange={(v) => setQualityFilter(v as typeof qualityFilter)}>
                <SelectTrigger className="h-9 text-xs w-44">
                  <SelectValue placeholder="Quality Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Items ({rows.length})</SelectItem>
                  <SelectItem value="missing_category" className="text-xs">Missing Category</SelectItem>
                  <SelectItem value="missing_sku" className="text-xs">Missing SKU</SelectItem>
                  <SelectItem value="price_zero" className="text-xs">Price ₦0 or Invalid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRowIds.size > 0 && (
              <Button size="sm" variant="destructive" onClick={deleteSelectedRows} className="gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedRowIds.size})
              </Button>
            )}
          </div>

          <Card>
            <ScrollArea className="h-[450px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.size > 0 && selectedRowIds.size === filteredRows.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-bold">Product Name</TableHead>
                    <TableHead className="text-xs font-bold">SKU</TableHead>
                    <TableHead className="text-xs font-bold text-right">Selling Price (₦)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Cost Price (₦)</TableHead>
                    <TableHead className="text-xs font-bold text-center">Stock</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Supplier</TableHead>
                    <TableHead className="text-xs font-bold text-center">Quality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                        No rows match your current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r) => (
                      <TableRow key={r._id} className={r.hasWarning ? "bg-amber-500/5" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.has(r._id)}
                            onChange={() => toggleSelectRow(r._id)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => updateRowField(r._id, "name", e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <input
                            type="text"
                            value={r.sku}
                            onChange={(e) => updateRowField(r._id, "sku", e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <input
                            type="number"
                            value={r.sellingPrice}
                            onChange={(e) => updateRowField(r._id, "sellingPrice", parseFloat(e.target.value) || 0)}
                            className="w-24 text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          <input
                            type="number"
                            value={r.costPrice}
                            onChange={(e) => updateRowField(r._id, "costPrice", parseFloat(e.target.value) || 0)}
                            className="w-24 text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          <input
                            type="number"
                            value={r.stockQuantity}
                            onChange={(e) => updateRowField(r._id, "stockQuantity", parseInt(e.target.value) || 0)}
                            className="w-16 text-center bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          <input
                            type="text"
                            value={r.category}
                            onChange={(e) => updateRowField(r._id, "category", e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <input
                            type="text"
                            value={r.supplier}
                            onChange={(e) => updateRowField(r._id, "supplier", e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {r.hasWarning ? (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400 text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> Warning
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Direct Import Confirmation Modal */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" /> Confirm Catalog Import
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will create {rows.length} new items directly inside your active store catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/30 rounded-lg space-y-2 border text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Items to Import:</span>
              <span className="font-bold">{rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categories Count:</span>
              <span className="font-bold">{categoriesList.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Stock Units:</span>
              <span className="font-bold">{rows.reduce((acc, r) => acc + (r.stockQuantity || 0), 0)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDirectImportToStore}
              disabled={isImporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Import Items Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guide Modal */}
      <CSVImportGuideModal open={showGuideModal} onOpenChange={setShowGuideModal} />
    </div>
  );
}
