import React from "react";

/**
 * NexaCoreLoader - A premium, high-end static loading screen for the Nexa platform.
 * Fully static to align with the animation removal system.
 */
export function NexaCoreLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-10">
      <div className="relative h-40 w-40">
        {/* Deep Background Glow - Static */}
        <div className="absolute inset-[-20%] rounded-full bg-primary/10 blur-[60px] opacity-30" />

        {/* Outer Orbiting Ring (Vertical Axis) - Static */}
        <div
          className="absolute inset-0 rounded-full border border-primary/20"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(70deg)" }}
        />

        {/* Inner Orbiting Ring (Horizontal Axis) - Static */}
        <div
          className="absolute inset-[15%] rounded-full border-2 border-primary/40 border-t-primary"
          style={{ transformStyle: "preserve-3d", transform: "rotateY(70deg)" }}
        />

        {/* Diagonal Stabilizer Ring - Static */}
        <div
          className="absolute inset-[5%] rounded-full border border-primary/10"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(45deg) rotateY(45deg)" }}
        />

        {/* The Central "Nexa" Core - Static */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-16 w-16 rounded-[24px] bg-primary flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(var(--primary),0.3)]">
            {/* Core Lens Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
            <div className="h-6 w-6 rounded-lg bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
          </div>
        </div>

        {/* Satellite Data Particles - Static */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 opacity-40"
            style={{ 
              transform: `rotate(${i * 45}deg) translate(50px) scale(0.8)`
            }}
          >
            <div className="h-full w-full rounded-full bg-primary/60 blur-[1px]" />
          </div>
        ))}
      </div>

      {/* Loading Text Section */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {["N", "E", "X", "A"].map((letter, i) => (
            <span
              key={i}
              className="text-2xl font-black tracking-tighter text-foreground"
            >
              {letter}
            </span>
          ))}
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/60">
            Initializing System
          </span>
          <div className="mt-2 h-[2px] w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
