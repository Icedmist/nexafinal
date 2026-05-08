import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Settings,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

const TOUR_STEPS = [
  {
    title: "Welcome to Nexa OS",
    description: "Your store's new operating system is ready. Let's walk through the core pillars of your dashboard.",
    icon: <Sparkles className="h-6 w-6 text-primary" />,
  },
  {
    title: "Control Center",
    description: "The Dashboard gives you a bird's-eye view of your business. Monitor total sales, active staff, and branch performance in one place.",
    icon: <BarChart3 className="h-6 w-6 text-purple-500" />,
  },
  {
    title: "Smart Sidebar",
    description: "On the left, you'll find your command center. Depending on your 'Simplicity' setting, we've organized your operations into logical groups like Sales, Finance, and Intelligence.",
    icon: <LayoutDashboard className="h-6 w-6 text-blue-500" />,
  },
  {
    title: "Rapid POS & Sales",
    description: "The 'Sales' module is where the magic happens. Use it to process orders, scan barcodes, and handle transactions at lightning speed.",
    icon: <ShoppingCart className="h-6 w-6 text-amber-500" />,
  },
  {
    title: "Global Inventory",
    description: "Under 'Catalog', track every unit you own. We support multi-branch stock tracking with automated alerts for low inventory.",
    icon: <Package className="h-6 w-6 text-primary" />,
  },
  {
    title: "Intelligence & Growth",
    description: "The 'Intelligence' section provides live analytics. See your top-selling products and financial trends to grow your business with data.",
    icon: <TrendingUp className="h-6 w-6 text-green-500" />,
  },
  {
    title: "System Settings",
    description: "Tailor the OS to your needs in 'Settings'. You can manage staff, configure branch locations, and update your business profile here.",
    icon: <Settings className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: "Need Help?",
    description: "Look for the 'Help' icon at the bottom of the sidebar for documentation or to reach our support team anytime.",
    icon: <HelpCircle className="h-6 w-6 text-primary" />,
  },
];

export function TourGuide() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (searchParams.get("tour") === "true") {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("tour");
    setSearchParams(newParams);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-card border-2 border-border rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-8 pt-10 text-center space-y-6 relative z-10">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shadow-inner ring-4 ring-background">
                  {TOUR_STEPS[currentStep].icon}
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">{TOUR_STEPS[currentStep].title}</h2>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  {TOUR_STEPS[currentStep].description}
                </p>
              </motion.div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} 
                    />
                  ))}
                </div>
                <Button 
                  onClick={handleNext}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 px-6"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? "Start Managing" : "Next"} <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
