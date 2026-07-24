import { Pill, Activity, AlertCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PharmaAdminPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Controlled Substances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">Dispensing logged</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drug Regulations</CardTitle>
          <CardDescription>Configure NAFDAC requirements and restricted dispensing rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[ 
              { class: "Class A - Narcotic", requirement: "Strict ID + Consultant Sign-off", status: "Active" },
              { class: "Class B - Antibiotic", requirement: "Standard Prescription", status: "Active" },
              { class: "Class C - OTC", requirement: "No Restriction", status: "Open" },
            ].map((reg) => (
              <div key={reg.class} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{reg.class}</p>
                  <p className="text-xs text-muted-foreground">{reg.requirement}</p>
                </div>
                <Button size="sm" variant="ghost">Edit</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Integrity</CardTitle>
          <CardDescription>Verify batch numbers and cold chain compliance tracking.</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20">
          <div className="text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Coming Soon: Cold Chain IoT Integration</p>
            <p className="text-xs text-muted-foreground">Automated temperature logging for vaccines is in development.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
