import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 px-6 text-center nexa-card max-w-lg mx-auto", className)}>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-black tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-8 flex items-center gap-4">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="rounded-xl px-8 h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="ghost" onClick={onSecondaryAction} className="rounded-xl font-bold">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
