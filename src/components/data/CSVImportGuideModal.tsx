import { useState } from "react";
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Table as TableIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export interface CSVImportGuideModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
}

export const NEXA_STANDARD_AI_PROMPT = `Please transform the following inventory / product data into the exact NexaStoreOS CSV import format.

Target Column Headers (Exact Names):
name,sku,sellingPrice,costPrice,stockQuantity,category,supplier,reorderLevel,barcode,description

Strict Formatting Rules:
1. 'name', 'sku', and 'sellingPrice' are REQUIRED for every single product.
2. Prices ('sellingPrice', 'costPrice') MUST be pure numbers without currency symbols (e.g. remove ₦, $, €, commas). For example, convert "₦ 15,000.00" to "15000".
3. 'stockQuantity' and 'reorderLevel' MUST be whole numbers (integers). Default stockQuantity to 0 if unknown, reorderLevel to 5.
4. If SKUs are missing, generate unique alphanumeric SKUs sequentially like "SKU-1001", "SKU-1002".
5. If Barcodes are missing, leave them blank or keep existing numeric barcode strings intact.
6. Clean up text fields by stripping surrounding quote artifacts and double spaces.
7. Output ONLY the raw CSV text inside a single \`\`\`csv markdown code block so I can save it as 'nexa_inventory_import.csv'.

Here is my raw inventory / spreadsheet data:
[PASTE YOUR RAW TABLE OR MESSY EXCEL TEXT HERE]`;

export function downloadSampleCSVTemplate() {
  const headers = "name,sku,sellingPrice,costPrice,stockQuantity,category,supplier,reorderLevel,barcode,description\n";
  const rows = [
    '"Coca Cola 50cl",SKU-1001,300,250,100,"Beverages","Nigerian Bottling Co",20,615100012345,"50cl PET bottle chilled soda"',
    '"Indomie Instant Noodles 70g",SKU-1002,150,120,250,"Groceries","Dufil Prima Foods",30,615100054321,"Chicken flavor 70g pack"',
    '"Golden Penny Sugar 500g",SKU-1003,950,850,45,"Groceries","Flour Mills Plc",10,615100088888,"Refined white sugar packet"',
    '"Peak Full Cream Milk 350g",SKU-1004,2400,2100,30,"Provisions","FrieslandCampina",8,615100099999,"Evaporated tin milk"'
  ].join("\n");

  const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "nexa_inventory_sample_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Nexa Sample Inventory CSV Template downloaded!");
}

export function CSVImportGuideContent() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(NEXA_STANDARD_AI_PROMPT);
    setCopiedPrompt(true);
    toast.success("AI Conversion Prompt copied to clipboard!");
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-muted border border-primary/20 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Nexa CSV Data Specification & AI Helper</h4>
            <p className="text-xs text-muted-foreground">Standardized header formats, fixing messy spreadsheets, and ready-to-use AI conversion prompt.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={downloadSampleCSVTemplate}
            className="gap-1.5 text-xs font-bold bg-background shadow-sm hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Download Sample CSV
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCopyPrompt}
            className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Sparkles className="h-3.5 w-3.5" />}
            {copiedPrompt ? "Prompt Copied!" : "Copy AI Prompt"}
          </Button>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="format" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-10 p-1 bg-muted/80">
          <TabsTrigger value="format" className="text-xs font-bold gap-1.5">
            <TableIcon className="h-3.5 w-3.5" /> Nexa Format
          </TabsTrigger>
          <TabsTrigger value="fixing" className="text-xs font-bold gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> Fix Messy CSV
          </TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs font-bold gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> AI Converter
          </TabsTrigger>
          <TabsTrigger value="agents" className="text-xs font-bold gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Agent Checklist
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Format Specs */}
        <TabsContent value="format" className="space-y-3 pt-3">
          <div className="text-xs text-muted-foreground">
            Below are the expected CSV column headers for importing inventory into NexaStoreOS. Ensure your column headers match these names (or map them during step 2 of the import drawer).
          </div>

          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="text-xs font-bold">Header</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold">Data Type</TableHead>
                  <TableHead className="text-xs font-bold">Example Value</TableHead>
                  <TableHead className="text-xs font-bold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-mono">
                <TableRow>
                  <TableCell className="font-bold text-primary">name</TableCell>
                  <TableCell><Badge className="bg-destructive/10 text-destructive border-none text-[10px]">Required</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Text</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">Coca Cola 50cl</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Item or product title.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold text-primary">sku</TableCell>
                  <TableCell><Badge className="bg-destructive/10 text-destructive border-none text-[10px]">Required</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Text</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">SKU-1001</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Unique item code or stock keeping unit.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold text-primary">sellingPrice</TableCell>
                  <TableCell><Badge className="bg-destructive/10 text-destructive border-none text-[10px]">Required</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Number</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">300</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Price in ₦. Do not include ₦ or commas.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">costPrice</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Number</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">250</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Purchase cost. Defaults to 0 if omitted.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">stockQuantity</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Integer</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">100</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Current inventory count. Defaults to 0.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">category</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Text</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">Beverages</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Category name (created automatically if new).</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">supplier</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Text</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">Nigerian Bottling Co</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Supplier or vendor name.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">reorderLevel</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Integer</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">20</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Low stock alert threshold. Defaults to 5.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">barcode</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Numeric string</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">615100012345</TableCell>
                  <TableCell className="text-muted-foreground font-sans">EAN/UPC barcode scanner code.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold font-mono">description</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Optional</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Text</TableCell>
                  <TableCell className="font-sans font-medium text-foreground">50cl PET bottle</TableCell>
                  <TableCell className="text-muted-foreground font-sans">Item description or notes.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: How to Fix Messy CSVs */}
        <TabsContent value="fixing" className="space-y-3 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Problem 1: Currency Symbols & Commas in Prices
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Raw client sheets often contain values like <code className="bg-muted px-1.5 py-0.5 rounded text-amber-600 font-mono">₦ 15,000.00</code> or <code className="bg-muted px-1.5 py-0.5 rounded text-amber-600 font-mono">$1,200</code>.
              </p>
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Solution:
                </span>
                <span>Use Excel / Google Sheets <strong>Find & Replace</strong> (Ctrl+H) to replace <code className="font-mono font-bold">₦</code> and <code className="font-mono font-bold">,</code> with empty text, or use our AI prompt below.</span>
              </div>
            </div>

            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Problem 2: Missing SKUs (Product Identifiers)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nexa requires a unique <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono">sku</code> per item. If the merchant only kept product names, import validation will flag missing SKUs.
              </p>
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Solution:
                </span>
                <span>Add a column titled <code className="font-mono font-bold">sku</code> and drag a formula like <code className="font-mono font-bold">="SKU-" & TEXT(ROW()-1, "0000")</code> to generate SKU-0001, SKU-0002, etc.</span>
              </div>
            </div>

            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Problem 3: Encoding & Excel Special Characters
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When saving from Microsoft Excel, saving as standard ANSI CSV can garble non-English text or smart quotes.
              </p>
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Solution:
                </span>
                <span>In Excel, choose <strong>Save As → CSV UTF-8 (Comma delimited) (*.csv)</strong>. Google Sheets automatically exports clean UTF-8.</span>
              </div>
            </div>

            <div className="p-3.5 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Problem 4: Unmatched Column Headers
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If the file has headers like "Item Description", "Unit Cost", or "Qty in Hand", Nexa's column mapper will ask you to match them manually.
              </p>
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Solution:
                </span>
                <span>During Step 2 of the Nexa Import Drawer, map your headers once. Nexa auto-detects common synonyms.</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: AI Converter Prompt */}
        <TabsContent value="prompt" className="space-y-3 pt-3">
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Ready-to-Use AI Prompt for ChatGPT / Gemini / Claude
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyPrompt}
                className="gap-1.5 text-xs font-bold"
              >
                {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedPrompt ? "Copied!" : "Copy Prompt"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If a merchant gives you a messy WhatsApp message, PDF scan text, or disorganized Excel table, paste this prompt into ChatGPT, Gemini, or Claude along with their raw data.
            </p>

            <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[220px]">
              {NEXA_STANDARD_AI_PROMPT}
            </pre>
          </div>
        </TabsContent>

        {/* Tab 4: Agent Checklist */}
        <TabsContent value="agents" className="space-y-3 pt-3">
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3 text-xs">
            <h5 className="font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Onboarding Field Agent Best Practices
            </h5>
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">Ask for existing records:</strong> Ask the shop owner if they have inventory in Excel, QuickBooks, Zoho, or paper sales books.
              </li>
              <li>
                <strong className="text-foreground">Use AI to digitize paper photos:</strong> Snap a photo of physical stock books, upload the image to ChatGPT/Gemini with our prompt, and ask it to extract rows directly into Nexa CSV format.
              </li>
              <li>
                <strong className="text-foreground">Verify high-volume SKUs:</strong> Ensure top selling items (e.g. drinks, staple foods, electronics) have accurate selling prices and barcode values before importing.
              </li>
              <li>
                <strong className="text-foreground">Test run with 5 rows:</strong> Do a quick test import of 5 products first to verify column mapping and tax/price accuracy before importing 1,000+ items.
              </li>
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CSVImportGuideModal({ open = false, onOpenChange, inline = false }: CSVImportGuideModalProps) {
  if (inline) {
    return <CSVImportGuideContent />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            CSV Import Specification & AI Converter Guide
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Complete guide on Nexa's CSV template format, fixing messy spreadsheets, and generating instant CSVs with AI.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <CSVImportGuideContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
