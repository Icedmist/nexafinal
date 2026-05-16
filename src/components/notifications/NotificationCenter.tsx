import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { X, CheckCheck, Bell, Settings2, History, Filter, Monitor } from "lucide-react";
import { NotificationPreferences } from "./NotificationPreferences";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDismissNotification } from "@/hooks/useNotifications";
import { useDeviceNotifications } from "@/hooks/useDeviceNotifications";
import { NotificationPermissionPrompt } from "./NotificationPermissionPrompt";
import { getNotificationIcon } from "./notification-icons";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/inventory";

import { ensureDate } from "@/lib/date-utils";

type FilterTab = "all" | "unread" | "stock" | "po" | "requests" | "sales";

const TAB_FILTER: Record<FilterTab, (n: Notification) => boolean> = {
  all: () => true,
  unread: (n) => !n.isRead,
  stock: (n) => n.type === "low_stock" || n.type === "zero_stock",
  po: (n) => n.type === "po_reminder" || n.type === "po_overdue",
  requests: (n) => n.type === "request_update" || n.type === "inventory_request",
  sales: (n) => n.type === "sale",
};

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPrefs?: () => void;
}

export function NotificationCenter({ open, onOpenChange, onOpenPrefs }: NotificationCenterProps) {
  const [tab, setTab] = useState<FilterTab>("all");
  const { data: notifications } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const dismiss = useDismissNotification();
  const { permission } = useDeviceNotifications();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const navigate = useNavigate();

  const filtered = notifications.filter(TAB_FILTER[tab]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = (n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.link) {
      onOpenChange(false);
      navigate(n.link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-none bg-transparent shadow-none flex items-center justify-center">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh] w-[94vw] sm:w-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 text-primary border-2 border-primary/20 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-tighter">
                      {unreadCount} Unread
                    </span>
                  )}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Alerts & Updates</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted" onClick={() => onOpenPrefs?.()} aria-label="Notification settings">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
              </Button>
              <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
              <TabsList className="h-11 w-full rounded-xl bg-muted/30 p-1 border-2 border-border/50">
                <TabsTrigger value="all" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Unread</TabsTrigger>
                <TabsTrigger value="stock" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Stock</TabsTrigger>
                <TabsTrigger value="po" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest">PO</TabsTrigger>
                <TabsTrigger value="requests" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Requests</TabsTrigger>
                <TabsTrigger value="sales" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Sales</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Device Permission Banner */}
          {permission !== "granted" && (
            <div className="mb-6 animate-in slide-in-from-top duration-500">
              <button 
                onClick={() => setShowPermissionPrompt(true)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-tight text-foreground">Enable Device Notifications</p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight mt-0.5">Stay updated even when the app is closed.</p>
                </div>
                <div className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest flex items-center justify-center shadow-sm">
                  Enable
                </div>
              </button>
            </div>
          )}

          <ScrollArea className="flex-1 -mx-2 px-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <Bell className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black text-foreground">All clear</p>
                  <p className="text-sm font-medium text-muted-foreground italic">No notifications found for this filter.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                {filtered.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => handleClick(n)}
                    onDismiss={() => dismiss(n.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {unreadCount > 0 && (
            <div className="mt-6 pt-6 border-t-2 border-border/50">
              <Button onClick={markAllAsRead} variant="outline" className="w-full h-12 rounded-xl border-2 font-black uppercase text-xs tracking-widest">
                <CheckCheck className="mr-2 h-4 w-4" /> Mark All as Read
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
      <NotificationPermissionPrompt open={showPermissionPrompt} onOpenChange={setShowPermissionPrompt} />
    </Dialog>
  );
}

function NotificationItem({
  notification: n,
  onClick,
  onDismiss,
}: {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-4 rounded-2xl border-2 p-4 transition-all hover:shadow-md",
        !n.isRead 
          ? "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06] hover:border-primary/30" 
          : "bg-muted/5 border-transparent hover:bg-muted/10 hover:border-border/50"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={cn(
        "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
        !n.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {getNotificationIcon(n.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-black leading-tight text-foreground">{n.title}</p>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap mt-0.5">
            {formatDistanceToNow(ensureDate(n.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-muted-foreground leading-relaxed">{n.message}</p>
      </div>

      <button
        type="button"
        className="shrink-0 self-start rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {!n.isRead && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-primary" />
      )}
    </div>
  );
}
