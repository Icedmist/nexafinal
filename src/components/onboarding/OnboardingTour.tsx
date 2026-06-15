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
  const isTargetVisible = !!(hasTarget && pos && pos.width > 0 && pos.height > 0);

  useEffect(() => {
    if (!isActive || !step?.target) { setPos(null); return; }
    
    const targetSelector = step.target as string;
    
    const findElement = () => {
      const selectors = [
        `[data-tour="${targetSelector}"]`,
        `#${targetSelector}`,
        targetSelector
      ];
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const rect = el.getBoundingClientRect();
            if (
              rect.width > 0 &&
              rect.height > 0 &&
              rect.right > 0 &&
              rect.bottom > 0 &&
              rect.left < window.innerWidth &&
              rect.top < window.innerHeight
            ) {
              return el;
            }
          }
        } catch (e) {
          // Ignore invalid selectors
        }
      }
      return null;
    };

    let el = findElement();
    let oldZ = "";
    let oldPos = "";
    if (el) {
      oldZ = el.style.zIndex;
      oldPos = el.style.position;
      el.style.position = oldPos || "relative";
      el.style.zIndex = "10002";
    }
    
    const updatePos = () => {
      const currentEl = findElement();
      if (!currentEl) {
        setPos(null);
        return;
      }
      if (currentEl !== el) {
        if (el) {
          el.style.zIndex = oldZ;
          el.style.position = oldPos;
        }
        el = currentEl;
        oldZ = el.style.zIndex;
        oldPos = el.style.position;
        el.style.position = oldPos || "relative";
        el.style.zIndex = "10002";
      }
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    
    return () => {
      if (el) {
        el.style.zIndex = oldZ;
        el.style.position = oldPos;
      }
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isActive, step, currentStep]);

  if (!isActive || !step) return null;

  const handleNext = () => {
    if (isLast) onComplete();
    else onNext();
  };

  const getPositionStyles = () => {
    if (!isTargetVisible) {
      return { top: "50%", bottom: "auto", left: "50%", x: -50, y: -50, arrowDir: "none", isCentered: true };
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const isMobile = vw < 768;
    const padding = isMobile ? 20 : 60; 
    
    if (isMobile) {
      // On mobile, if target is high, place at bottom. 
      // Otherwise, place at top.
      if (pos.top < vh * 0.5) {
        return { top: "auto", bottom: 76, left: "50%", x: -50, y: 0, arrowDir: "none", isCentered: false };
      }
      return { top: 76, bottom: "auto", left: "50%", x: -50, y: 0, arrowDir: "none", isCentered: false };
    }

    let top: string | number = pos.top + pos.height + padding;
    let left: number | string = pos.left;
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

    if (typeof left === "number" && left + 340 > vw) {
      left = vw - 340 - 20;
    }
    if (typeof left === "number" && left < 20) {
      left = 20;
    }

    return { top, bottom: "auto", left, x: 0, y: 0, arrowDir, isCentered: false };
  };

  const { top: cardTop, bottom: cardBottom, left: cardLeft, x, y, arrowDir, isCentered } = getPositionStyles();

  // Calculate line path
  const getLinePath = () => {
    if (!pos || arrowDir === "none") return "";
    
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
 
    if (arrowDir === "left") {
      startX = typeof cardLeft === "number" ? cardLeft : 0;
      startY = (typeof cardTop === "number" ? cardTop : 0) + 60;
      endX = pos.left + pos.width;
      endY = pos.top + 100;
    } else if (arrowDir === "top") {
      startX = (typeof cardLeft === "number" ? cardLeft : 0) + 170;
      startY = typeof cardTop === "number" ? cardTop : 0;
      endX = pos.left + pos.width / 2;
      endY = pos.top + pos.height;
    } else if (arrowDir === "bottom") {
      startX = (typeof cardLeft === "number" ? cardLeft : 0) + 170;
      startY = (typeof cardTop === "number" ? cardTop : 0) + 220;
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
        className={`absolute inset-0 transition-colors duration-300 pointer-events-auto ${
          isTargetVisible ? "bg-background/20 backdrop-blur-[2px]" : "bg-black/50 backdrop-blur-[4px]"
        }`} 
        onClick={onSkip} 
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[10001]">
        <AnimatePresence mode="wait">
          {isTargetVisible && (
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
        {isTargetVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1, 
              top: pos!.top - 4, 
              left: pos!.left - 4, 
              width: pos!.width + 8, 
              height: pos!.height + 8 
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
          bottom: isCentered ? "auto" : cardBottom,
          left: isCentered ? "50%" : cardLeft,
          translateX: `${x}%`,
          translateY: `${y}%`
        }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="absolute z-[10003] w-[calc(100vw-32px)] max-w-[340px] bg-card border-2 border-primary/30 rounded-3xl md:rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] pointer-events-auto"
      >
        <div className="p-6 md:p-8 space-y-4 md:space-y-6">
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
