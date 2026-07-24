import { useState, useMemo } from "react";
import { Sparkles, Brain, Cpu, TrendingUp, CheckCircle, RefreshCw, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useItems, useMovements, useCategories } from "@/hooks/useInventoryData";
import { useUpdateItem, useCreateItem } from "@/hooks/useInventoryMutations";
import { ItemStatus } from "@/types/inventory";
import {
  generateBehavioralRecommendations,
  generateMarketUsageRecommendations,
  getTrainingModelStats,
  runSelfTrainingCycle,
  saveLearnedCategoryKeyword,
  type RecommendationItem,
  type TrainingModelStats,
} from "@/lib/recommendationEngine";

export function SelfTrainingRecommendationsSection() {
  const { data: items = [] } = useItems();
  const { data: movements = [] } = useMovements(100);
  const { data: categories = [] } = useCategories();

  const updateItem = useUpdateItem();
  const createItem = useCreateItem();

  const [filterTab, setFilterTab] = useState<string>("all");
  const [isTraining, setIsTraining] = useState(false);
  const [modelStats, setModelStats] = useState<TrainingModelStats>(() => getTrainingModelStats());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const behavioralRecs = useMemo(
    () => generateBehavioralRecommendations(items, movements, categories),
    [items, movements, categories]
  );

  const marketRecs = useMemo(
    () => generateMarketUsageRecommendations(items, "general"),
    [items]
  );

  const allRecs = useMemo(() => {
    const combined = [...behavioralRecs, ...marketRecs];
    return combined.filter((r) => !dismissedIds.has(r.id));
  }, [behavioralRecs, marketRecs, dismissedIds]);

  const filteredRecs = useMemo(() => {
    if (filterTab === "behavior") return allRecs.filter((r) => r.source === "user_behavior");
    if (filterTab === "market") return allRecs.filter((r) => r.source === "market_usage");
    if (filterTab === "taxonomy") return allRecs.filter((r) => r.type === "category_optimization");
    return allRecs;
  }, [allRecs, filterTab]);

  const handleRunTraining = async () => {
    setIsTraining(true);
    toast.info("AI Model re-training initiated...", { description: "Processing transaction logs & keyword affinity maps." });

    setTimeout(() => {
      const updated = runSelfTrainingCycle(items, movements, categories);
      setModelStats(updated);
      setIsTraining(false);
      toast.success("Self-Training Completed!", {
        description: `Model updated to ${updated.categoryAccuracyPercent}% accuracy across ${updated.learnedKeywordsCount} learned keywords.`,
      });
    }, 1200);
  };

  const handleAction = (rec: RecommendationItem) => {
    const { actionType, payload } = rec.suggestedAction;
    const p = payload as Record<string, unknown>;

    if (actionType === "apply_category") {
      const itemId = p.itemId as string;
      const categoryName = p.categoryName as string;
      const targetCat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());

      updateItem.mutate(
        {
          id: itemId,
          updates: {
            categoryId: targetCat ? targetCat.id : undefined,
          },
        },
        {
          onSuccess: () => {
            const itemObj = items.find((i) => i.id === itemId);
            if (itemObj) {
              saveLearnedCategoryKeyword(itemObj.name, categoryName);
            }
            toast.success(`Category updated to "${categoryName}" & model trained!`);
            setDismissedIds((prev) => new Set([...prev, rec.id]));
          },
          onError: (err) => toast.error(err.message || "Failed to update category."),
        }
      );
    } else if (actionType === "adjust_price") {
      const itemId = p.itemId as string;
      const newSellingPrice = p.newSellingPrice as number;
      updateItem.mutate(
        { id: itemId, updates: { sellingPrice: newSellingPrice } },
        {
          onSuccess: () => {
            toast.success(`Price adjusted to ₦${newSellingPrice.toLocaleString()}.`);
            setDismissedIds((prev) => new Set([...prev, rec.id]));
          },
          onError: (err) => toast.error(err.message || "Failed to adjust price."),
        }
      );
    } else if (actionType === "add_suggested_item") {
      const name = p.name as string;
      const categoryName = p.categoryName as string;
      const defaultUnit = p.defaultUnit as string;
      const description = p.description as string;
      const costPrice = p.costPrice as number;
      const sellingPrice = p.sellingPrice as number;
      const emoji = p.emoji as string;
      const targetCat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());

      createItem.mutate(
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sku: `MKT-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: null,
          name,
          description,
          categoryId: targetCat ? targetCat.id : null,
          status: ItemStatus.Active,
          unit: defaultUnit || "pcs",
          currentStock: 10,
          reorderPoint: 5,
          reorderQuantity: 20,
          costPrice,
          sellingPrice,
          locationId: null,
          supplierId: null,
          imageUrl: null,
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          onSuccess: () => {
            toast.success(`Added "${name}" to your catalog from market recommendations!`);
            setDismissedIds((prev) => new Set([...prev, rec.id]));
          },
          onError: (err) => toast.error(err.message || "Failed to add item."),
        }
      );
    } else if (actionType === "reorder") {
      const itemId = p.itemId as string;
      const quantity = p.quantity as number;
      const item = items.find((i) => i.id === itemId);
      if (item) {
        updateItem.mutate(
          { id: itemId, updates: { reorderQuantity: quantity } },
          {
            onSuccess: () => {
              toast.success(`Reorder threshold protected for ${item.name}.`);
              setDismissedIds((prev) => new Set([...prev, rec.id]));
            },
          }
        );
      }
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    toast.message("Recommendation dismissed.");
  };

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-foreground">AI Self-Training Recommendation Engine</h2>
            <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
              Adaptive Feedback Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Learns continuously from merchant transactions, category edits, and sector market signals to deliver accurate product recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunTraining}
            disabled={isTraining}
            className="border-purple-500/20 hover:bg-purple-500/10 text-xs gap-2 font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-purple-600 ${isTraining ? "animate-spin" : ""}`} />
            {isTraining ? "Training Engine..." : "Run Self-Training Cycle"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Model Accuracy</span>
            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">{modelStats.categoryAccuracyPercent}%</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+1.4% auto-tuned</span>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Learned Keywords</span>
            <Tag className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">{modelStats.learnedKeywordsCount}</span>
            <span className="text-[10px] text-muted-foreground">patterns mapped</span>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Behavior Interactions</span>
            <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">{modelStats.totalInteractions}</span>
            <span className="text-[10px] text-muted-foreground">events processed</span>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Last Auto-Trained</span>
            <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-1 text-xs font-semibold text-foreground truncate">
            {new Date(modelStats.lastTrainedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="all" className="text-xs">All Signals ({allRecs.length})</TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs">User Behavior ({allRecs.filter((r) => r.source === "user_behavior").length})</TabsTrigger>
            <TabsTrigger value="market" className="text-xs">Market Usage ({allRecs.filter((r) => r.source === "market_usage").length})</TabsTrigger>
            <TabsTrigger value="taxonomy" className="text-xs">Category Taxonomy ({allRecs.filter((r) => r.type === "category_optimization").length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredRecs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p>No active recommendations for this filter right now.</p>
          <p className="text-xs mt-1">All catalog items and pricing signals are optimal.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecs.map((rec) => {
            const isUserBehavior = rec.source === "user_behavior";
            const isMarketUsage = rec.source === "market_usage";

            return (
              <Card key={rec.id} className="relative flex flex-col justify-between overflow-hidden border transition-all hover:border-purple-500/40">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-semibold ${
                        isUserBehavior
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          : isMarketUsage
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                      }`}
                    >
                      {isUserBehavior ? "User Behavior Signal" : isMarketUsage ? "Market Intelligence Signal" : "Self-Trained Model Match"}
                    </Badge>

                    <Badge variant="outline" className="text-[10px] font-bold border-purple-500/20">
                      {rec.impactScore}% Impact
                    </Badge>
                  </div>

                  <CardTitle className="text-sm font-bold text-foreground mt-2 leading-snug">
                    {rec.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    {rec.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {rec.metrics && (
                    <div className="rounded-md bg-muted/30 p-2.5 text-xs flex flex-wrap gap-x-4 gap-y-1">
                      {rec.metrics.estimatedRevenueLift && (
                        <div>
                          <span className="text-muted-foreground">Proj. Revenue: </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{rec.metrics.estimatedRevenueLift}</span>
                        </div>
                      )}
                      {rec.metrics.marginPercent !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Current Margin: </span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{rec.metrics.marginPercent}%</span>
                        </div>
                      )}
                      {rec.metrics.velocity !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Moved Recently: </span>
                          <span className="font-semibold text-foreground">{rec.metrics.velocity} units</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                      onClick={() => handleAction(rec)}
                    >
                      {rec.suggestedAction.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleDismiss(rec.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
