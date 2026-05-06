import React from "react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LogIn, ShoppingBag, ArrowRightLeft, UserPlus, AlertCircle, 
  Clock, Mail, User, MapPin 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  login: { icon: LogIn, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  sale: { icon: ShoppingBag, color: "text-green-500", bgColor: "bg-green-500/10" },
  movement: { icon: ArrowRightLeft, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  inventory_alert: { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  staff_onboarding: { icon: UserPlus, color: "text-purple-500", bgColor: "bg-purple-500/10" },
};

export const StaffActivityLog: React.FC = () => {
  const { logs, loading } = useActivityLogs(50);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold">No activity yet</h3>
          <p className="text-sm text-muted-foreground">Recent actions will appear here as they happen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {logs.map((log) => {
          const config = TYPE_CONFIG[log.type] || { icon: AlertCircle, color: "text-gray-500", bgColor: "bg-gray-500/10" };
          const Icon = config.icon;
          
          return (
            <div 
              key={log.id} 
              className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-card transition-all hover:shadow-md hover:border-primary/20 group"
            >
              <div className={cn("mt-1 p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", config.bgColor, config.color)}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm truncate">{log.title}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    {log.createdAt ? format(log.createdAt.toDate(), "MMM d, HH:mm") : "Just now"}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {log.message}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <User className="h-3 w-3" />
                    {log.userEmail.split("@")[0]}
                  </div>
                  {log.branchId && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary/70">
                      <MapPin className="h-3 w-3" />
                      Branch: {log.branchId}
                    </div>
                  )}
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter px-1.5 h-4">
                    {log.type.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
