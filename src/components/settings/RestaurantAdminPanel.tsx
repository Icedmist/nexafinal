import { UtensilsCrossed, ChefHat, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RestaurantAdminPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-orange-600" />
              Menu Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground mt-1">across 6 categories</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-purple-600" />
              Avg Prep Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18m</div>
            <p className="text-xs text-muted-foreground mt-1">-2m from last week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kitchen Categories</CardTitle>
          <CardDescription>Manage how orders are sent to the Grill, Prep, or Bar stations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[ 
              { name: "Grill Station", items: 12, printer: "Printer IP [192.168.1.50]" },
              { name: "Cold Prep / Salad", items: 8, printer: "Printer IP [192.168.1.51]" },
              { name: "Bar / Beverage", items: 28, printer: "Printer IP [192.168.1.52]" },
            ].map((station) => (
              <div key={station.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{station.name}</p>
                  <p className="text-xs text-muted-foreground">{station.items} active items • {station.printer}</p>
                </div>
                <Button size="sm" variant="outline">Manage</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipe Costing</CardTitle>
          <CardDescription>Automated ingredient-to-dish price calculations specialized for Restaurants.</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20">
          <div className="text-center">
            <ChefHat className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Coming Soon: Visual Recipe Builder</p>
            <p className="text-xs text-muted-foreground">Detailed margin analysis per ingredient is in development.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
