import { useState, useCallback, useMemo, useRef, type DragEvent } from "react";
import { Upload, FileSpreadsheet, AlertCircle, ChevronRight, ChevronLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ───────────────────────────────────────────────

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  /** If true, value must be a valid number */
  numeric?: boolean;
}

export interface ValidatedRow {
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface CSVImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ImportField[];
  /** Called with all valid rows to import. Returns { created, failed } counts. */
  onImport: (rows: Record<string, string>[]) => Promise<{ created: number; failed: number }>;
  entityName?: string;
  existingSkus?: string[];
  knownCategories?: string[];
  knownSuppliers?: string[];
}

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

// ─── CSV Parser ──────────────────────────────────────────

function parseCSV(text: string): ParsedCSV {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current.length > 0 || lines.length > 0) {
        lines.push(current);
        current = "";
      }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);

  function splitRow(line: string): string[] {
    const cols: string[] = [];
    let col = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { col += '"'; i++; }
        else q = !q;
      } else if (c === "," && !q) {
        cols.push(col.trim());
        col = "";
      } else {
        col += c;
      }
    }
    cols.push(col.trim());
    return cols;
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xfeff) headerLine = headerLine.slice(1);

  const headers = splitRow(headerLine);
  const rows = lines.slice(1).map(splitRow).filter((r) => r.some((c) => c.length > 0));

  return { headers, rows };
}

// ─── Auto-mapping ────────────────────────────────────────

function autoMap(csvHeaders: string[], fields: ImportField[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of fields) {
    const normalised = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = csvHeaders.find((h) => {
      const n = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n === normalised || n.includes(normalised) || normalised.includes(n);
    });
    if (match) mapping[field.key] = match;
  }
  return mapping;
}

// ─── Validation ──────────────────────────────────────────

function validateRows(
  mappedRows: Record<string, string>[],
  fields: ImportField[],
  existingSkus: string[],
  knownCategories: string[],
  knownSuppliers: string[],
): ValidatedRow[] {
  const seenSkus = new Set<string>(existingSkus.map((s) => s.toLowerCase()));
  const fileSkus = new Set<string>();
  const catSet = new Set(knownCategories.map((c) => c.toLowerCase()));
  const supSet = new Set(knownSuppliers.map((s) => s.toLowerCase()));

  return mappedRows.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    for (const f of fields) {
      if (f.required && !row[f.key]?.trim()) {
        errors.push(`Missing required field: ${f.label}`);
      }
    }

    // Numeric validation
    for (const f of fields) {
      if (f.numeric && row[f.key]?.trim()) {
        const v = Number(row[f.key]);
        if (isNaN(v)) errors.push(`${f.label} must be a number`);
      }
    }

    // SKU uniqueness
    const sku = row.sku?.trim().toLowerCase();
    if (sku) {
      if (seenSkus.has(sku) || fileSkus.has(sku)) {
        errors.push("Duplicate SKU");
      } else {
        fileSkus.add(sku);
      }
    }

    // Category / supplier warnings
    const cat = row.category?.trim();
    if (cat && !catSet.has(cat.toLowerCase())) {
      warnings.push(`New category: "${cat}"`);
    }
    const sup = row.supplier?.trim();
    if (sup && !supSet.has(sup.toLowerCase())) {
      warnings.push(`New supplier: "${sup}"`);
    }

    return { data: row, errors, warnings };
  });
}

// ─── Step Indicator ──────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition-all ${
            i + 1 === current
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
              : i + 1 < current
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────

export function CSVImportSheet({
  open,
  onOpenChange,
  fields,
  onImport,
  entityName = "items",
  existingSkus = [],
  knownCategories = [],
  knownSuppliers = [],
}: CSVImportSheetProps) {
  const [step, setStep] = useState(1);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 4; // upload → mapping → validation → execute

  const reset = useCallback(() => {
    setStep(1);
    setParsed(null);
    setFileError(null);
    setFileName("");
    setMapping({});
    setIsDragOver(false);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setFileError("Only .csv files are accepted.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File exceeds 5 MB limit.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const csv = parseCSV(text);
        if (csv.headers.length === 0) {
          setFileError("Could not detect any columns. Check the file format.");
          return;
        }
        setParsed(csv);
        setMapping(autoMap(csv.headers, fields));
        setStep(2);
      };
      reader.onerror = () => setFileError("Failed to read file.");
      reader.readAsText(file);
    },
    [fields],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const requiredFields = useMemo(() => fields.filter((f) => f.required), [fields]);

  const unmappedRequired = useMemo(() => {
    return requiredFields.filter((f) => !mapping[f.key]);
  }, [requiredFields, mapping]);

  const mappedRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((row) => {
      const obj: Record<string, string> = {};
      for (const field of fields) {
        const csvHeader = mapping[field.key];
        if (csvHeader) {
          const idx = parsed.headers.indexOf(csvHeader);
          obj[field.key] = idx >= 0 ? (row[idx] ?? "") : "";
        }
      }
      return obj;
    });
  }, [parsed, mapping, fields]);

  // Validation (computed when on step 3)
  const validatedRows = useMemo(() => {
    if (step < 3) return [];
    return validateRows(mappedRows, fields, existingSkus, knownCategories, knownSuppliers);
  }, [step, mappedRows, fields, existingSkus, knownCategories, knownSuppliers]);

  const validCount = useMemo(() => validatedRows.filter((r) => r.errors.length === 0).length, [validatedRows]);
  const errorCount = useMemo(() => validatedRows.filter((r) => r.errors.length > 0).length, [validatedRows]);
  const warningCount = useMemo(() => validatedRows.filter((r) => r.warnings.length > 0 && r.errors.length === 0).length, [validatedRows]);

  // Preview columns: only mapped fields
  const previewFields = useMemo(() => fields.filter((f) => mapping[f.key]), [fields, mapping]);
  const previewRows = useMemo(() => validatedRows.slice(0, 20), [validatedRows]);

  const startImport = useCallback(async (rows: Record<string, string>[]) => {
    setStep(4);
    setIsImporting(true);
    setImportProgress(0);
    try {
      // Simulate progress ticks for UX (actual import is batch)
      const progressInterval = setInterval(() => {
        setImportProgress((p) => Math.min(p + 5, 90));
      }, 100);
      const result = await onImport(rows);
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
    } catch {
      setImportResult({ created: 0, failed: rows.length });
    } finally {
      setIsImporting(false);
    }
  }, [onImport]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isImporting) { reset(); onOpenChange(v); }
        else if (!isImporting) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">Import {entityName}</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {step === 1 && "Upload your CSV data source."}
                {step === 2 && "Map your CSV columns to app fields."}
                {step === 3 && "Review data before final import."}
                {step === 4 && (isImporting ? "Processing rows..." : "Import complete.")}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button onClick={() => !isImporting && onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
              <StepIndicator current={step} total={totalSteps} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {/* ── Step 1: File Upload ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? "border-primary bg-primary/5 scale-[0.99]"
                      : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-black text-foreground">
                      Drop CSV file here
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">or click to browse your computer</p>
                    <p className="mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 bg-muted rounded-full inline-block">.csv only • max 5 MB</p>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </div>

                {fileError && (
                  <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm font-bold text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {fileError}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Column Mapping ── */}
            {step === 2 && parsed && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/10 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-foreground truncate">{fileName}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {parsed.rows.length} rows detected • {parsed.headers.length} columns
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Column Mapping</h3>
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div key={field.key} className="flex items-center gap-4 p-3 rounded-2xl border-2 border-border/50 bg-muted/5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground truncate">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="text-[9px] font-black uppercase tracking-tighter text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-3/5">
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <Select
                            value={mapping[field.key] ?? "__skip__"}
                            onValueChange={(v) =>
                              setMapping((prev) => ({
                                ...prev,
                                [field.key]: v === "__skip__" ? "" : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-10 rounded-xl border-2 bg-card font-medium text-xs">
                              <SelectValue placeholder="Skip column" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="__skip__">— Skip —</SelectItem>
                              {parsed.headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {unmappedRequired.length > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl bg-destructive/5 border-2 border-destructive/10 p-4 text-xs font-bold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Wait! Required fields not mapped: {unmappedRequired.map((f) => f.label).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Validation & Preview ── */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4" />
                    {validCount} Valid
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2 text-xs font-black text-destructive uppercase tracking-wider">
                      <XCircle className="h-4 w-4" />
                      {errorCount} Errors
                    </div>
                  )}
                  {warningCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4" />
                      {warningCount} Warnings
                    </div>
                  )}
                </div>

                {/* Preview table */}
                <div className="rounded-2xl border-2 border-border overflow-hidden">
                  <ScrollArea className="max-h-[40vh] w-full">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-b-2">
                          <TableHead className="w-12 text-[10px] font-black uppercase">#</TableHead>
                          {previewFields.slice(0, 5).map((f) => (
                            <TableHead key={f.key} className="text-[10px] font-black uppercase">{f.label}</TableHead>
                          ))}
                          <TableHead className="text-[10px] font-black uppercase text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, idx) => {
                          const hasError = row.errors.length > 0;
                          const hasWarning = row.warnings.length > 0;
                          return (
                            <TableRow
                              key={idx}
                              className={`border-b transition-colors ${hasError ? "bg-destructive/5" : hasWarning ? "bg-amber-500/5" : "hover:bg-muted/20"}`}
                            >
                              <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">{idx + 1}</TableCell>
                              {previewFields.slice(0, 5).map((f) => (
                                <TableCell key={f.key} className="text-xs font-medium max-w-[120px] truncate">
                                  {row.data[f.key] || <span className="text-muted-foreground/30">—</span>}
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                {hasError ? (
                                  <span className="text-[10px] font-black uppercase text-destructive" title={row.errors.join("; ")}>
                                    Error
                                  </span>
                                ) : hasWarning ? (
                                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400" title={row.warnings.join("; ")}>
                                    Warning
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Ready</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {validatedRows.length > 20 && (
                  <p className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-widest">
                    Showing first 20 of {validatedRows.length} rows
                  </p>
                )}
              </div>
            )}

            {/* ── Step 4: Execution ── */}
            {step === 4 && (
              <div className="flex flex-col items-center gap-8 py-12">
                {isImporting ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                      <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                    </div>
                    <div className="w-full max-w-sm space-y-4">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                        <span className="text-primary">Importing Data...</span>
                        <span className="text-foreground">{importProgress}%</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted border border-border shadow-inner">
                        <div
                          className="h-full rounded-full bg-primary shadow-lg shadow-primary/30 transition-all duration-300 ease-out"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : importResult ? (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-2xl font-black tracking-tight text-foreground">Import Successful</p>
                      <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto">
                        We've successfully added <span className="text-foreground font-black">{importResult.created}</span> {entityName} to your catalog.
                        {importResult.failed > 0 && <span className="block mt-2 text-destructive font-bold">{importResult.failed} rows failed to process.</span>}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="mt-8 flex items-center justify-between border-t-2 border-border pt-6">
            <div>
              {step > 1 && step < 4 && (
                <Button variant="ghost" className="h-11 rounded-xl font-bold px-4" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step === 2 && (
                <Button
                  className="h-11 min-w-[140px] rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                  disabled={unmappedRequired.length > 0}
                  onClick={() => setStep(3)}
                >
                  Validate Data
                </Button>
              )}

              {step === 3 && (
                <>
                  {errorCount > 0 && validCount > 0 && (
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-black uppercase text-xs tracking-widest border-2"
                      onClick={() => {
                        const validRows = validatedRows
                          .filter((r) => r.errors.length === 0)
                          .map((r) => r.data);
                        startImport(validRows);
                      }}
                    >
                      Import {validCount} Valid
                    </Button>
                  )}
                  {validCount > 0 && (
                    <Button
                      className="h-11 min-w-[160px] rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                      onClick={() => {
                        const validRows = validatedRows
                          .filter((r) => r.errors.length === 0)
                          .map((r) => r.data);
                        startImport(validRows);
                      }}
                    >
                      Import {validCount} Rows
                    </Button>
                  )}
                  {validCount === 0 && (
                    <Button className="h-11 rounded-xl font-black uppercase text-xs tracking-widest" disabled>
                      No Valid Data
                    </Button>
                  )}
                </>
              )}

              {step === 4 && !isImporting && (
                <Button
                  className="h-11 min-w-[120px] rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                  }}
                >
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
  );
}
