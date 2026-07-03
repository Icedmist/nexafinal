import { useOfflineMode } from '@/hooks/useOfflineMode';
import { Wifi, WifiOff, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function OfflineStatusIndicator() {
  const { isOnline, offlineEnabled, toggleOfflineMode, syncStatus, cachedData } = useOfflineMode();

  const getStatusColor = () => {
    if (!isOnline) return 'text-destructive';
    if (offlineEnabled) return 'text-amber-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (offlineEnabled) return <Download className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusLabel = () => {
    if (!isOnline) return 'No Connection';
    if (offlineEnabled) return 'Offline Mode Active';
    return 'Online';
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="h-3 w-3 text-amber-500" />;
      case 'synced':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
      {/* Status Info */}
      <div className="flex items-center gap-2 flex-1">
        <div className={cn('flex items-center gap-1.5', getStatusColor())}>
          {getStatusIcon()}
          <span className="text-xs font-semibold uppercase tracking-widest">{getStatusLabel()}</span>
        </div>

        {offlineEnabled && cachedData && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {getSyncIcon()}
            <span>
              {cachedData.sales?.length || 0} sales, {cachedData.debtPayments?.length || 0} payments cached
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <Button
        size="sm"
        variant={offlineEnabled ? 'destructive' : 'outline'}
        onClick={toggleOfflineMode}
        disabled={!isOnline && offlineEnabled}
        className="text-xs font-black uppercase tracking-widest gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        {offlineEnabled ? 'Disable Offline' : 'Enable Offline'}
      </Button>

      {/* Status Badge */}
      {!isOnline && (
        <Badge variant="destructive" className="text-[10px] font-black">
          OFFLINE
        </Badge>
      )}
    </div>
  );
}
