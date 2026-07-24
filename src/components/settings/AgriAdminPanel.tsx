import { Sprout, Cloud, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AgriAdminPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sprout className="h-4 w-4 text-emerald-600" />
              Active Crops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">4 harvest ready</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-600" />
              Soil Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Optimal</div>
            <p className="text-xs text-muted-foreground mt-1">Moisture at 68%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Harvest Cycles</CardTitle>
          <CardDescription>Manage planting schedules and expected yields per location.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[ 
              { crop: "Maize (Hybrid)", plot: "North Field", status: "Growing", progress: 65 },
              { crop: "Soybeans", plot: "East Terrace", status: "Ready", progress: 100 },
              { crop: "Cassava", plot: "South Area", status: "Planting", progress: 10 },
            ].map((cycle) => (
              <div key={cycle.crop} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{cycle.crop}</p>
                  <p className="text-xs text-muted-foreground">{cycle.plot} • {cycle.status}</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-24 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                     <div className="h-full bg-primary" style={{ width: `${cycle.progress}%` }} />
                   </div>
                   <Button size="sm" variant="outline">Adjust</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resource Allocation</CardTitle>
          <CardDescription>Fertilizer, seed stock, and labor management specialized for Agriculture.</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20">
          <div className="text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Coming Soon: Weekly Resource Planner</p>
            <p className="text-xs text-muted-foreground">Automated seed-to-sale tracking is being processed.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
