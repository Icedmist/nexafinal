import React from "react";
import { useRole } from "@/hooks/useRole";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/FirebaseAuthContext";

export const StoreAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isStoreMismatch } = useRole();
  const { logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background nexa-gradient-mesh">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
               <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-primary/70">Nexa Store OS</p>
            <p className="text-xs font-bold text-muted-foreground">Verifying system access credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isStoreMismatch) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030711] p-6 relative overflow-hidden">
        {/* Cinematic Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-destructive/10 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 w-full max-w-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-12 duration-1000 ease-out">
          <div className="nexa-glass bg-card/40 border-destructive/30 p-10 md:p-16 text-center space-y-10 shadow-[0_48px_100px_-20px_rgba(0,0,0,0.5)] rounded-[2.5rem] backdrop-blur-2xl">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-destructive/10 text-destructive border-2 border-destructive/20 shadow-[inset_0_2px_12px_rgba(255,0,0,0.1)] relative group">
              <ShieldAlert className="h-14 w-14 group-hover:scale-110 transition-transform duration-700 ease-out" />
            </div>
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive">Protocol Violation</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none">
                Access <span className="text-destructive">Blocked</span>
              </h1>
              <p className="text-muted-foreground font-medium leading-relaxed text-sm md:text-base max-w-sm mx-auto">
                Your credentials are not authorized for <span className="text-foreground font-bold underline decoration-destructive/40 decoration-2 underline-offset-4">{window.location.hostname}</span>.
              </p>
            </div>

            <div className="bg-black/40 rounded-3xl p-8 border border-white/5 text-left space-y-4 relative overflow-hidden group/audit">
              <div className="absolute -top-4 -right-4 p-2 opacity-5 group-hover/audit:opacity-10 transition-opacity">
                <ShieldAlert className="h-24 w-24" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-destructive/80">Security Audit Logs</p>
                <div className="h-1 w-12 bg-destructive/20 rounded-full" />
              </div>
              <ul className="text-xs font-medium text-muted-foreground/70 space-y-4">
                <li className="flex gap-4 items-start">
                  <div className="h-5 w-5 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  </div>
                  <span className="leading-tight">Domain mismatch detected between authenticated claims and current environment.</span>
                </li>
                <li className="flex gap-4 items-start">
                   <div className="h-5 w-5 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  </div>
                  <span className="leading-tight">Cross-tenant session access restricted by Nexa Security Engine.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <Button 
                variant="destructive" 
                className="h-16 rounded-[1.25rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-destructive/20 hover:shadow-destructive/40 transition-all active:scale-[0.97] nexa-button-shine group" 
                onClick={() => logout()}
              >
                <LogOut className="mr-3 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                Logout
              </Button>
              <Button 
                variant="ghost" 
                className="h-14 rounded-[1.25rem] font-bold text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors uppercase tracking-widest text-[10px]" 
                onClick={() => window.location.href = "/"}
              >
                Return to Core Platform
              </Button>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">
                System Host: {window.location.hostname}
              </p>
              <div className="h-1 w-1 bg-muted-foreground/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
