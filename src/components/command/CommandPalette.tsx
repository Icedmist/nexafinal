import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { canAccessRoute } from "@/lib/route-guard";
import { useRole } from "@/hooks/useRole";
import {
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useItems, useCategories, useSuppliers } from "@/hooks/useInventoryData";
import { usePermissions } from "@/hooks/usePermissions";
import { parseQuery } from "@/lib/nl-search-parser";
import { PAGES } from "./palette-pages";
import { ACTIONS } from "./palette-actions";
import { ItemResultRow } from "./ItemResultRow";
import { collection, query as fsQuery, getDocs, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Building2, User as UserIcon } from "lucide-react";

// ─── Component ───────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { can } = usePermissions();
  const { role, isSystemAdmin } = useRole();
  
  // Platform-wide search results
  const [platformStores, setPlatformStores] = useState<any[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [searchingPlatform, setSearchingPlatform] = useState(false);

  // Reset query on close
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.toLowerCase().trim();

  // NL search parsing
  const parsed = useMemo(() => parseQuery(query), [query]);
  const isNL = parsed.isNaturalLanguage && q.length > 0;

  // NL filtered items
  const nlItems = useMemo(() => {
    if (!isNL) return [];
    let results = [...items];

    // Status filter
    if (parsed.filters.status) {
      if (parsed.filters.status === "low_stock") {
        results = results.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint);
      } else if (parsed.filters.status === "out_of_stock") {
        results = results.filter((i) => i.currentStock <= 0);
      } else if (parsed.filters.status === "active") {
        results = results.filter((i) => i.status === "active" && i.currentStock > 0);
      }
    }

    // Category filter (fuzzy match on category name)
    if (parsed.filters.category) {
      const catName = parsed.filters.category.toLowerCase();
      const matchingCats = categories.filter((c) => c.name.toLowerCase().includes(catName));
      if (matchingCats.length > 0) {
        const catIds = new Set(matchingCats.map((c) => c.id));
        results = results.filter((i) => i.categoryId && catIds.has(i.categoryId));
      }
    }

    // Supplier filter
    if (parsed.filters.supplier) {
      const supName = parsed.filters.supplier.toLowerCase();
      const matchingSups = suppliers.filter((s) => s.name.toLowerCase().includes(supName));
      if (matchingSups.length > 0) {
        const supIds = new Set(matchingSups.map((s) => s.id));
        results = results.filter((i) => i.supplierId && supIds.has(i.supplierId));
      }
    }

    // Search terms
    if (parsed.searchTerms.length > 0) {
      results = results.filter((i) =>
        parsed.searchTerms.every((t) =>
          i.name.toLowerCase().includes(t) || i.sku.toLowerCase().includes(t),
        ),
      );
    }

    return results.slice(0, 10);
  }, [isNL, items, parsed, categories, suppliers]);

  // Platform-wide search (Firestore)
  useEffect(() => {
    if (!isSystemAdmin || q.length < 2) {
      setPlatformStores([]);
      setPlatformUsers([]);
      return;
    }

    const searchPlatform = async () => {
      setSearchingPlatform(true);
      try {
        // Search stores
        const storesSnap = await getDocs(fsQuery(
          collection(db, "stores"),
          where("name", ">=", query),
          where("name", "<=", query + "\uf8ff"),
          limit(5)
        ));
        
        // Search users
        const usersSnap = await getDocs(fsQuery(
          collection(db, "users"),
          where("displayName", ">=", query),
          where("displayName", "<=", query + "\uf8ff"),
          limit(5)
        ));

        setPlatformStores(storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'store' })));
        setPlatformUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'user' })));
      } catch (err) {
        console.error("Platform search error:", err);
      } finally {
        setSearchingPlatform(false);
      }
    };

    const timeout = setTimeout(searchPlatform, 300);
    return () => clearTimeout(timeout);
  }, [isSystemAdmin, query, q]);

  // Standard item search results (max 8)
  const matchedItems = useMemo(() => {
    if (isNL || q.length < 1) return [];
    return items
      .filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [items, q, isNL]);

  // Filter pages by query + role
  const matchedPages = useMemo(() => {
    const accessible = PAGES.filter((p) => canAccessRoute(p.path, role));
    if (!q) return accessible;
    return accessible.filter((p) => p.label.toLowerCase().includes(q));
  }, [q, role]);

  // Filter actions by query + permissions
  const matchedActions = useMemo(() => {
    const allowed = ACTIONS.filter((a) => !a.permission || can(a.permission));
    if (!q) return allowed;
    return allowed.filter((a) => a.label.toLowerCase().includes(q));
  }, [q, can]);

  const hasResults = matchedItems.length > 0 || nlItems.length > 0 || matchedPages.length > 0 || matchedActions.length > 0 || platformStores.length > 0 || platformUsers.length > 0;

  const handleSelect = useCallback(
    (value: string) => {
      onOpenChange(false);

      if (value.startsWith("store:")) {
        const slug = value.replace("store:", "");
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        let targetUrl = "";
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          targetUrl = `${protocol}//${slug}.localhost${port ? `:${port}` : ""}/app/dashboard`;
        } else {
          const parts = host.split(".");
          const domain = parts.slice(-2).join(".");
          targetUrl = `${protocol}//${slug}.${domain}/app/dashboard`;
        }
        window.open(targetUrl, "_blank");
        return;
      }

      if (value.startsWith("item:")) {
        const itemId = value.replace("item:", "");
        navigate("/app/catalog?item=" + itemId);
        return;
      }

      if (value.startsWith("page:")) {
        const path = value.replace("page:", "");
        navigate(path);
        return;
      }

      if (value.startsWith("action:")) {
        const label = value.replace("action:", "");
        const action = ACTIONS.find((a) => a.label === label);
        action?.action(navigate);
      }
    },
    [navigate, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <CommandPrimitive
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Search items, pages, actions…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {searchingPlatform && (
              <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                Searching platform...
              </div>
            )}
            {!hasResults && !searchingPlatform && <CommandEmpty>No results found.</CommandEmpty>}

            {/* Platform Results (Global) */}
            {isSystemAdmin && platformStores.length > 0 && (
              <CommandGroup heading="Platform: Businesses">
                {platformStores.map((store) => (
                  <CommandItem
                    key={store.id}
                    value={`store:${store.slug}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-3"
                  >
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-bold">{store.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{store.slug}.nexa.os</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isSystemAdmin && platformUsers.length > 0 && (
              <CommandGroup heading="Platform: Global Users">
                {platformUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`user:${user.id}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-3"
                  >
                    <UserIcon className="h-4 w-4 text-purple-500" />
                    <div className="flex flex-col">
                      <span className="font-bold">{user.displayName || user.email}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Global User Account</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* NL Search Results */}
            {isNL && nlItems.length > 0 && (
              <CommandGroup heading="Search Results">
                <div className="px-2 pb-2 flex flex-wrap gap-1">
                  {parsed.filters.status && (
                    <Badge variant="outline" className="text-[10px]">status: {parsed.filters.status}</Badge>
                  )}
                  {parsed.filters.category && (
                    <Badge variant="outline" className="text-[10px]">category: {parsed.filters.category}</Badge>
                  )}
                  {parsed.filters.supplier && (
                    <Badge variant="outline" className="text-[10px]">supplier: {parsed.filters.supplier}</Badge>
                  )}
                  {parsed.searchTerms.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">terms: {parsed.searchTerms.join(", ")}</Badge>
                  )}
                </div>
                {nlItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`item:${item.id}`}
                    onSelect={handleSelect}
                  >
                    <ItemResultRow item={item} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {isNL && nlItems.length === 0 && q.length > 0 && (
              <CommandEmpty>
                <div className="space-y-1">
                  <p>No items match your query.</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {parsed.filters.status && (
                      <Badge variant="outline" className="text-[10px]">status: {parsed.filters.status}</Badge>
                    )}
                    {parsed.filters.category && (
                      <Badge variant="outline" className="text-[10px]">category: {parsed.filters.category}</Badge>
                    )}
                  </div>
                </div>
              </CommandEmpty>
            )}

            {/* Standard item search */}
            {matchedItems.length > 0 && (
              <CommandGroup heading="Items">
                {matchedItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`item:${item.id}`}
                    onSelect={handleSelect}
                  >
                    <ItemResultRow item={item} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedPages.length > 0 && (
              <CommandGroup heading="Pages">
                {matchedPages.map((page) => (
                  <CommandItem
                    key={page.path}
                    value={`page:${page.path}`}
                    onSelect={handleSelect}
                  >
                    {page.icon}
                    <span>{page.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedActions.length > 0 && (
              <CommandGroup heading="Actions">
                {matchedActions.map((action) => (
                  <CommandItem
                    key={action.label}
                    value={`action:${action.label}`}
                    onSelect={handleSelect}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                    {action.shortcut && (
                      <CommandShortcut>{action.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
