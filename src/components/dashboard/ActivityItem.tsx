import { format } from "date-fns";
import { PackageCheck, PackageMinus, PenLine, ArrowLeftRight, Package } from "lucide-react";
import { MovementType, type StockMovement } from "@/types/inventory";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [MovementType.Received]: PackageCheck,
  [MovementType.Shipped]: PackageMinus,
  [MovementType.Adjusted]: PenLine,
  [MovementType.Transferred]: ArrowLeftRight,
};

const LABELS: Record<string, string> = {
  [MovementType.Received]: "Stock Received",
  [MovementType.Shipped]: "Stock Dispatched",
  [MovementType.Adjusted]: "Stock Adjustment",
  [MovementType.Transferred]: "Stock Transfer",
};

interface ActivityItemProps {
  movement: StockMovement;
  itemName?: string;
}

export function ActivityItem({ movement, itemName }: ActivityItemProps) {
  const Icon = ICONS[movement.type] ?? ArrowLeftRight;
  const isIn = movement.type === MovementType.Received;
  const qtyPrefix = isIn ? "+" : "-";
  const qtyColor = isIn ? "text-emerald-500" : "text-rose-500";

  return (
    <div className="flex gap-4 group">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-none">
          {LABELS[movement.type]}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          <span className={`font-black ${qtyColor}`}>{qtyPrefix}{Math.abs(movement.quantity)}</span> {itemName || movement.itemId}
        </p>
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase">
          {format(new Date(movement.createdAt), "HH:mm")} • {movement.performedBy}
        </p>
      </div>
    </div>
  );
}
