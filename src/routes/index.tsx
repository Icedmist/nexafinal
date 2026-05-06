import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Package,
  ScanLine,
  TrendingUp,
  Users,
  ArrowRight,
  Shield,
  Globe,
  Zap,
  Sparkles,
  Command,
  Eye,
  EyeOff,
  Building2,
  Linkedin,
  Layers,
} from "lucide-react";
import { NexaHero3D } from "@/components/landing/NexaHero3D";
import nexaLogo from "@/assets/nexa-logo.svg";
import type { Store } from "@/types/tenant";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "NEXA Store OS — Inventory System for Modern Retail" },
      {
        name: "description",
        content: "The OS for modern retail commerce. Track stock, manage suppliers, and automate reorders from your pocket.",
      },
    ],
  }),
});

/* ─── Components ────────────────────────────────────── */

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary rounded-2xl p-2 shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
            <img src={nexaLogo} className="h-8 w-8 invert brightness-0" alt="NEXA Logo" />
          </div>
          <span className="text-xl font-black tracking-tight uppercase italic">NEXA Store OS</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/app/dashboard">
              <Button className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                Dashboard <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth/login">
                <Button variant="ghost" className="font-bold text-sm rounded-xl">Login</Button>
              </Link>
              <Link to="/auth/signup">
                <Button className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-primary/20">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function LandingPage() {
  const { store, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (store && user) {
      navigate({ to: "/app/dashboard", replace: true });
    }
  }, [store, user, navigate]);

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (store) {
    if (user) return null;
    return <StoreLoginPage store={store} />;
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
        <Nav />

        {/* ── Hero Section ─────────────────────────────── */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Left Column: Text */}
            <div className="flex-1 text-center lg:text-left">
              <RevealSection>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">v2.0 Inventory System</span>
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8 bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                  Control your <br /> Commerce. <br /> 
                  <span className="text-primary italic">Anywhere.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10">
                  NEXA is the unified OS for modern retail. Track inventory, manage global suppliers, and forecast demand — all from a single interface designed for speed.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link to="/auth/signup">
                    <Button 
                      className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
                    >
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/auth/login">
                    <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold text-sm border-2">
                      Login to Portal
                    </Button>
                  </Link>
                </div>

                <div className="mt-12 flex items-center gap-6 justify-center lg:justify-start grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Cloud OS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Secure Cloud</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Real-time sync</span>
                  </div>
                </div>
              </RevealSection>
            </div>

            {/* Right Column: Visual */}
            <div className="flex-1 relative lg:w-1/2">
              <RevealSection delay={300} className="relative z-10">
                <div className="absolute -inset-4 bg-primary/20 blur-[100px] rounded-full -z-10 animate-pulse" />
                
                <NexaHero3D />
                
                {/* Floating elements */}
                <div className="absolute top-1/4 -right-12 hidden xl:block animate-float">
                  <div className="bg-card/80 backdrop-blur-md border-2 border-border p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-stock-healthy/10 flex items-center justify-center text-stock-healthy">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sales Trend</p>
                      <p className="text-lg font-black text-foreground">+24.8%</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-1/4 -left-12 hidden xl:block animate-float-delayed">
                  <div className="bg-card/80 backdrop-blur-md border-2 border-border p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Stock</p>
                      <p className="text-lg font-black text-foreground">1,284 Units</p>
                    </div>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ── Value Propositions ───────────────────────── */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
            <ValueProp 
              icon={Globe}
              title="Global Availability"
              description="A professional web-based interface accessible from any device. Manage your entire retail operation through a browser."
            />
            <ValueProp 
              icon={Command}
              title="Unified Operations"
              description="Inventory, Suppliers, Analytics, and Staff Management in one cohesive OS. No more jumping between apps."
            />
            <ValueProp 
              icon={Sparkles}
              title="Intelligent Insights"
              description="AI-powered forecasting and smart reorder alerts help you stay ahead of demand without the guesswork."
            />
          </div>
        </section>

        {/* ── Section F: Feature Showcase ── */}
        <section id="features" className="py-32 px-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full -z-10" />
          <div className="max-w-7xl mx-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <RevealSection>
                   <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 mb-6">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Advanced Features</span>
                   </div>
                   <h2 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tighter mb-10">
                     Built for the <br /> <span className="text-primary italic">next generation</span> <br /> of retail.
                   </h2>
                   <div className="space-y-10">
                      <FeaturePoint 
                        icon={ScanLine}
                        title="Hyper-Fast Scanning"
                        text="Integrated barcode support designed for rapid-fire logistics. Process hundreds of units in minutes, not hours."
                      />
                      <FeaturePoint 
                        icon={Globe}
                        title="Global Synchronization"
                        text="Your data follows you everywhere. Real-time cloud sync ensures every branch is always perfectly aligned."
                      />
                      <FeaturePoint 
                        icon={Shield}
                        title="Enterprise Security"
                        text="Granular role-based access control. Protect your sensitive business data with bank-grade encryption."
                      />
                   </div>
                </RevealSection>
                <RevealSection delay={200} className="relative lg:h-[600px] flex items-center justify-center">
                   <div className="relative w-full max-w-lg aspect-square">
                      {/* Glassmorphism UI Deck */}
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-primary/10 to-transparent rounded-[3rem] blur-[80px]" />
                      
                      <div className="relative rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden group">
                         <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                         
                         <div className="bg-muted/30 aspect-video rounded-[2rem] flex items-center justify-center p-8 overflow-hidden relative mb-6">
                            <div className="absolute inset-0 bg-primary/20" />
                            <div className="relative z-10 text-center">
                               <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/20">
                                  <Layers className="h-10 w-10 text-white animate-pulse" />
                               </div>
                               <p className="font-black text-xl uppercase tracking-widest text-white">Cloud Architecture</p>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                               <TrendingUp className="h-5 w-5 text-primary mb-2" />
                               <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary w-3/4" />
                               </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                               <Users className="h-5 w-5 text-primary mb-2" />
                               <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-secondary w-1/2" />
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Floating Accent */}
                      <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-primary/30 rounded-full blur-[60px] animate-pulse" />
                   </div>
                </RevealSection>
             </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto rounded-[3rem] bg-foreground text-background p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -z-10" />
             <RevealSection>
                <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-8">
                  The OS your store <br /> deserves.
                </h2>
                <p className="text-background/60 text-lg md:text-xl font-medium max-w-xl mx-auto mb-12">
                  Stop wrestling with spreadsheets. Start scaling with a modern, high-performance inventory system.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                   <Link to="/auth/signup">
                    <Button className="h-16 px-10 rounded-2xl bg-background text-foreground font-black uppercase tracking-widest text-xs hover:bg-background/90 transition-all">
                      Get Started Now
                    </Button>
                   </Link>
                   <Link to="/auth/login">
                     <Button variant="ghost" className="h-16 px-10 rounded-2xl text-background/80 hover:text-background font-bold text-lg">
                       Staff Login <ArrowRight className="ml-2 h-5 w-5" />
                     </Button>
                   </Link>
                </div>
             </RevealSection>
          </div>
        </section>

        <footer className="py-20 border-t border-border px-6">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                 <Package className="h-5 w-5 text-primary" />
                 <span className="font-black italic text-lg uppercase">NEXA Store OS</span>
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">© 2026 NEXA Store OS</p>
              <div className="flex gap-8 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                 <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                   <Linkedin className="h-3 w-3" /> LinkedIn
                 </a>
              </div>
           </div>
        </footer>
      </div>
    </>
  );
}

function ValueProp({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <RevealSection className="group">
      <div className="mb-6 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner transition-transform group-hover:rotate-6">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{title}</h3>
      <p className="text-muted-foreground font-medium leading-relaxed">{description}</p>
    </RevealSection>
  );
}

function FeaturePoint({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h4 className="font-black text-lg uppercase tracking-tight mb-2">{title}</h4>
        <p className="text-muted-foreground font-medium text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function StoreLoginPage({ store }: { store: Store }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(`Welcome back to ${store.name}!`);
      navigate({ to: "/app/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary/30">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 flex text-primary mb-6 shadow-inner ring-8 ring-primary/5">
             <Building2 className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">{store.name}</h1>
          <p className="mt-2 text-sm font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 rounded-[2.5rem] border-2 border-border bg-card p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-2 font-bold focus:border-primary/50 transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-2 font-bold pr-12 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 relative z-10 overflow-hidden group/btn" disabled={loading}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Access System"}
          </Button>
        </form>

        <div className="text-center pt-4">
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
            <Package className="h-3 w-3" /> NEXA OS CORE
          </Link>
        </div>
      </div>
    </div>
  );
}
