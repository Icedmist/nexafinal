import { motion, AnimatePresence } from "framer-motion";
import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodPlateProps {
  items: { id: string; name: string; quantity: number; emoji?: string }[];
  className?: string;
}

export function FoodPlate({ items, className }: FoodPlateProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={cn("relative flex items-center justify-center p-4", className)}>
      {/* The Physical Plate */}
      <div className="relative h-48 w-48 rounded-full bg-white shadow-inner border-[12px] border-muted/20 flex items-center justify-center">
        <div className="absolute inset-4 rounded-full border border-muted/10" />
        
        {totalItems === 0 && (
          <div className="flex flex-col items-center justify-center text-muted-foreground/30 animate-pulse">
            <Utensils className="h-8 w-8 mb-1" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Empty Plate</span>
          </div>
        )}

        {/* Animated Food Items */}
        <div className="relative h-full w-full">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ scale: 0, opacity: 0, x: -100, y: -100 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1, 
                  x: Math.cos(index * 0.8) * 40, 
                  y: Math.sin(index * 0.8) * 40,
                  rotate: index * 45
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 100 }}
                className="absolute left-1/2 top-1/2 -ml-4 -mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm border border-border text-lg"
              >
                {item.emoji || "🍲"}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Plate Reflection/Detail */}
      <div className="absolute top-8 right-12 h-4 w-12 rounded-full bg-white/40 blur-sm rotate-45 pointer-events-none" />
    </div>
  );
}
