import { Outlet, Link } from "react-router-dom";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <header className="px-6 py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-primary rounded-2xl p-2 shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent uppercase italic">
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

      <footer className="px-6 py-8 flex flex-col items-center gap-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50">
        <div className="flex items-center gap-4">
          <a href={(() => {
            const host = window.location.host;
            if (host.includes('localhost') || host.includes('127.0.0.1')) {
              const portPart = host.split(':')[1];
              const port = portPart ? `:${portPart}` : '';
              return `${window.location.protocol}//localhost${port}`;
            }
            // If it's a subdomain (e.g., store.nexastoreos.com), get the root (nexastoreos.com)
            const parts = host.split('.');
            if (parts.length >= 3) {
              return `${window.location.protocol}//${parts.slice(-2).join('.')}`;
            }
            return `${window.location.protocol}//nexastoreos.com`;
          })()} className="hover:text-primary transition-colors">NEXA Core Technology</a>
        </div>
        <p>© {new Date().getFullYear()} NEXA OS</p>
      </footer>
    </div>
  );
}
