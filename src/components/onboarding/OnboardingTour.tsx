import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/hooks/useOnboarding";

interface Props {
  steps: TourStep[];
  currentStep: number;
  isActive: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function OnboardingTour({ steps, currentStep, isActive, onNext, onBack, onSkip, onComplete }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const hasTarget = !!step?.target;

  useEffect(() => {
    if (!isActive || !step?.target) { setPos(null); return; }
    
    const targetSelector = step.target as string;
    
    const findElement = () => {
       const el = document.querySelector(`[data-tour="${targetSelector}"]`) || 
                  document.getElementById(targetSelector) || 
                  document.querySelector(targetSelector);
       return el as HTMLElement | null;
    };

    const el = findElement();
    if (!el) { setPos(null); return; }
    
    const updatePos = () => {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    
    const oldZ = el.style.zIndex;
    const oldPos = el.style.position;
    el.style.position = oldPos || "relative";
    el.style.zIndex = "10002";

    return () => {
      el.style.zIndex = oldZ;
      el.style.position = oldPos;
      window.removeEventListener('resize', updatePos);
    };
  }, [isActive, step, currentStep]);

  if (!isActive || !step) return null;

  const handleNext = () => {
    if (isLast) onComplete();
    else onNext();
  };

  const getPositionStyles = () => {
    const isCentered = !hasTarget || !pos;
    if (isCentered) {
      return { top: 0, left: 0, x: -50, y: -50, arrowDir: "none", isCentered: true };
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const isMobile = vw < 768;
    const padding = isMobile ? 20 : 60; 
    
    if (isMobile) {
      // On mobile, if centered or target is high, place at bottom. 
      // Otherwise, try to avoid the target.
      if (isCentered || pos.top < vh * 0.4) {
        return { top: vh - 300, left: (vw - 340) / 2, x: 0, y: 0, arrowDir: "none", isCentered: false };
      }
      return { top: 20, left: (vw - 340) / 2, x: 0, y: 0, arrowDir: "none", isCentered: false };
    }

    let top = pos.top + pos.height + padding;
    let left = pos.left;
    let arrowDir = "top";

    if (top + 250 > vh) {
      top = pos.top - padding - 220;
      arrowDir = "bottom";
    }

    if (pos.height > vh * 0.4) {
      top = pos.top + 100;
      left = pos.left + pos.width + padding;
      arrowDir = "left";
    }

    if (left + 340 > vw) {
      left = vw - 340 - 20;
    }
    if (left < 20) {
      left = 20;
    }

    return { top, left, x: 0, y: 0, arrowDir, isCentered: false };
  };

  const { top: cardTop, left: cardLeft, x, y, arrowDir, isCentered } = getPositionStyles();

  // Calculate line path
  const getLinePath = () => {
    if (!pos || arrowDir === "none") return "";
    
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    if (arrowDir === "left") {
      startX = cardLeft;
      startY = cardTop + 60;
      endX = pos.left + pos.width;
      endY = pos.top + 100;
    } else if (arrowDir === "top") {
      startX = cardLeft + 170;
      startY = cardTop;
      endX = pos.left + pos.width / 2;
      endY = pos.top + pos.height;
    } else if (arrowDir === "bottom") {
      startX = cardLeft + 170;
      startY = cardTop + 220;
      endX = pos.left + pos.width / 2;
      endY = pos.top;
    }

    const controlX = startX + (endX - startX) * 0.5;
    const controlY = startY;

    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/20 backdrop-blur-[2px] pointer-events-auto" 
        onClick={onSkip} 
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[10001]">
        <AnimatePresence mode="wait">
          {hasTarget && pos && (
            <g key={currentStep}>
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                d={getLinePath()}
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray="8 6"
                strokeLinecap="round"
                fill="none"
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                cx={(() => {
                  const path = getLinePath();
                  const match = path.match(/([0-9.]+)\s+([0-9.]+)$/);
                  return match ? match[1] : 0;
                })()}
                cy={(() => {
                  const path = getLinePath();
                  const match = path.match(/([0-9.]+)\s+([0-9.]+)$/);
                  return match ? match[2] : 0;
                })()}
                r="4"
                fill="hsl(var(--primary))"
                transition={{ delay: 0.5 }}
              />
            </g>
          )}
        </AnimatePresence>
      </svg>

      <AnimatePresence>
        {hasTarget && pos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1, 
              top: pos.top - 4, 
              left: pos.left - 4, 
              width: pos.width + 8, 
              height: pos.height + 8 
            }}
            className="absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-[10001]"
          />
        )}
      </AnimatePresence>

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          top: isCentered ? "50%" : cardTop, 
          left: isCentered ? "50%" : cardLeft,
          translateX: `${x}%`,
          translateY: `${y}%`
        }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="absolute z-[10003] w-full max-w-[340px] bg-card border-2 border-primary/30 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] pointer-events-auto"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <button onClick={onSkip} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">{step.title}</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i === currentStep ? "w-6 bg-primary" : "w-1 bg-muted-foreground/20"}`} />
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleNext} size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
                {isLast ? "Done" : "Next"} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
