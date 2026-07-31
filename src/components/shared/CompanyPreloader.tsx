import { motion, AnimatePresence } from "framer-motion";
import { NexaLogo } from "@/components/shared/NexaLogo";
import { ShieldCheck, Sparkles } from "lucide-react";

interface CompanyPreloaderProps {
  show: boolean;
  message?: string;
  submessage?: string;
  logoUrl?: string;
}

export function CompanyPreloader({
  show,
  message = "Welcome to Nexa OS",
  submessage = "Preparing your dashboard...",
  logoUrl,
}: CompanyPreloaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-sidebar/95 backdrop-blur-2xl text-sidebar-foreground select-none p-4"
        >
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/25 blur-3xl pointer-events-none animate-pulse" />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-sm w-full space-y-6 relative z-10"
          >
            {/* Logo Container */}
            <div className="relative p-5 rounded-2xl bg-sidebar-accent border border-sidebar-border shadow-2xl shadow-primary/10 flex items-center justify-center min-w-[180px]">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="h-12 w-auto object-contain max-w-[200px]"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <NexaLogo variant="full" height={40} className="filter drop-shadow-md" />
              )}
            </div>

            {/* Status & Messages */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-sm font-bold tracking-tight text-sidebar-foreground">
                <Sparkles className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                <span>{message}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {submessage}
              </p>
            </div>

            {/* 1.2s Animated Progress Bar */}
            <div className="w-48 h-1.5 bg-sidebar-border rounded-full overflow-hidden p-0.5 border border-sidebar-accent">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-primary via-nexa-blue to-nexa-violet rounded-full shadow-sm"
              />
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-sidebar-accent px-3 py-1 rounded-full border border-sidebar-border">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Nexa OS Secure Workspace</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
