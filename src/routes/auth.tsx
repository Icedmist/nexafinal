import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <header className="px-6 py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary rounded-xl p-1.5 transition-transform group-hover:rotate-12">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            NEXA Store OS
          </span>
        </Link>
        
        <Link to="/">
          <Button variant="ghost" className="gap-2 rounded-xl font-bold">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50">
        © {new Date().getFullYear()} NEXA Core Technology
      </footer>
    </div>
  );
}
