import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Loader2 } from "lucide-react";

/**
 * LogoutOverlay - A full-screen premium overlay that provides visual feedback
 * when a user is being logged out and their session data is being deeply cleared.
 */
export function LogoutOverlay() {
  const { isLoggingOut } = useAuth();

  return (
    <AnimatePresence>
      {isLoggingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-background/80 backdrop-blur-xl"
        >
          {/* Background Ambient Glow */}
          <div className="absolute h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] opacity-40" />

          <div className="relative z-10 flex flex-col items-center gap-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase">
                Logging Out
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-[280px] font-medium leading-relaxed">
                Securely clearing your encrypted local data and finalizing vault security...
              </p>
            </div>

            {/* Security Progress Indicator */}
            <div className="mt-4 flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary/60"
                />
              ))}
            </div>
          </div>

          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 p-8">
            <div className="h-8 w-8 border-t border-l border-primary/20" />
          </div>
          <div className="absolute bottom-0 right-0 p-8">
            <div className="h-8 w-8 border-b border-r border-primary/20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
