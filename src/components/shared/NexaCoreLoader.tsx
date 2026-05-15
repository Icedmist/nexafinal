import { motion } from "framer-motion";

/**
 * NexaCoreLoader - A premium, high-end loading animation for the Nexa platform.
 * Features:
 * - Glowing glassmorphic core
 * - Dual-axis rotating orbits (3D effect)
 * - Floating "data points" particles
 * - Pulsing status typography
 */
export function NexaCoreLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-10">
      <div className="relative h-40 w-40">
        {/* Deep Background Glow */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-[-20%] rounded-full bg-primary/30 blur-[60px]"
        />

        {/* Outer Orbiting Ring (Vertical Axis) */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 rounded-full border border-primary/20"
          style={{ transformStyle: "preserve-3d", rotateX: "70deg" }}
        />

        {/* Inner Orbiting Ring (Horizontal Axis) */}
        <motion.div
          animate={{ rotateZ: -360 }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[15%] rounded-full border-2 border-primary/40 border-t-primary"
          style={{ transformStyle: "preserve-3d", rotateY: "70deg" }}
        />

        {/* Diagonal Stabilizer Ring */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[5%] rounded-full border border-primary/10"
          style={{ transformStyle: "preserve-3d", rotateX: "45deg", rotateY: "45deg" }}
        />

        {/* The Central "Nexa" Core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 90, 180, 270, 360],
              boxShadow: [
                "0 0 30px rgba(var(--primary), 0.2)",
                "0 0 60px rgba(var(--primary), 0.5)",
                "0 0 30px rgba(var(--primary), 0.2)",
              ],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 10, repeat: Infinity, ease: "linear" }
            }}
            className="relative h-16 w-16 rounded-[24px] bg-primary flex items-center justify-center overflow-hidden"
          >
            {/* Core Lens Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
            <div className="h-6 w-6 rounded-lg bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
          </motion.div>
        </div>

        {/* Satellite Data Particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              rotate: 360,
              scale: [0.5, 1, 0.5],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2"
            style={{ originX: "50px", originY: "50px" }}
          >
            <div className="h-full w-full rounded-full bg-primary/60 blur-[1px]" />
          </motion.div>
        ))}
      </div>

      {/* Loading Text Section */}
      <div className="flex flex-col items-center gap-3">
        <motion.div 
          className="flex gap-1"
          initial="initial"
          animate="animate"
        >
          {["N", "E", "X", "A"].map((letter, i) => (
            <motion.span
              key={i}
              variants={{
                initial: { y: 0, opacity: 0.5 },
                animate: { y: [-2, 2, -2], opacity: [0.5, 1, 0.5] }
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
              className="text-2xl font-black tracking-tighter text-foreground"
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/60">
            Initializing System
          </span>
          <motion.div 
            className="mt-2 h-[2px] w-32 overflow-hidden rounded-full bg-muted"
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 bg-primary"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
