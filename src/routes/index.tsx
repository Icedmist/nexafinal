import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useDemo } from "@/hooks/useDemo";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useState, useEffect } from "react";
import { BusinessOnboarding } from "@/components/onboarding/BusinessOnboarding";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import {
  Package,
  BarChart3,
  Bell,
  Truck,
  ScanLine,
  TrendingUp,
  Users,
  ArrowRight,
  Shield,
  Globe,
  Zap,
  Menu,
  X,
  Layers,
  Sparkles,
  Command,
  Smartphone,
} from "lucide-react";
import nexaMobileHero from "@/assets/nexa-mobile-hero.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "NEXA Store OS — Command Center for Modern Retail" },
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
          <div className="bg-primary rounded-xl p-2 shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-black tracking-tight uppercase italic">NEXA</span>
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
  const { enterDemoMode } = useDemo();
  const { store, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleTryDemo = () => setShowOnboarding(true);

  const handleOnboardingComplete = (_businessType: string, _categories: string[], _storeName: string) => {
    enterDemoMode({ businessType: _businessType, categories: _categories, storeName: _storeName, storePhone: "", storeAddress: "", receiptFooter: "Thank you for your patronage!", taxRate: 0 });
    navigate({ to: "/app/dashboard" });
  };

  return (
    <>
      {showOnboarding && (
        <BusinessOnboarding 
          onComplete={handleOnboardingComplete} 
          onSkip={() => { enterDemoMode(); navigate({ to: "/app/dashboard" }); }} 
        />
      )}

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
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">v2.0 Command Center</span>
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8 bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
                  Control your <br /> Commerce. <br /> 
                  <span className="text-primary italic">Anywhere.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10">
                  NEXA is the unified OS for modern retail. Track inventory, manage global suppliers, and forecast demand — all from a single interface designed for speed.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Button 
                    onClick={handleTryDemo}
                    className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
                  >
                    Launch Command Center <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Link to="/auth/signup">
                    <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold text-sm border-2">
                      Create Business Account
                    </Button>
                  </Link>
                </div>

                <div className="mt-12 flex items-center gap-6 justify-center lg:justify-start grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Mobile First</span>
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
                <img 
                  src={nexaMobileHero} 
                  alt="NEXA Mobile Experience" 
                  className="w-full max-w-[600px] mx-auto lg:mx-0 drop-shadow-[0_50px_50px_rgba(0,0,0,0.5)] transform hover:scale-[1.02] transition-transform duration-700"
                />
                
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
              icon={Smartphone}
              title="Native Mobile Control"
              description="A full-featured command center that fits in your pocket. Manage stock from the warehouse floor or the back office."
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

        {/* ── Detailed Showcase ── */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <RevealSection>
                   <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-8">
                     Built for the <br /> <span className="text-primary italic">next generation</span> <br /> of retail.
                   </h2>
                   <div className="space-y-8">
                      <FeaturePoint 
                        icon={ScanLine}
                        title="Hyper-Fast Scanning"
                        text="Internal logistics optimized for speed. Integrated barcode support makes receiving shipments effortless."
                      />
                      <FeaturePoint 
                        icon={Globe}
                        title="Multi-Location Sync"
                        text="Scale to infinite branches. Real-time sync ensures every staff member sees the exact same data."
                      />
                      <FeaturePoint 
                        icon={Users}
                        title="Granular Permissions"
                        text="Secure role-based access. Control exactly what managers, staff, and admins can see and do."
                      />
                   </div>
                </RevealSection>
                <RevealSection delay={200} className="relative">
                   <div className="aspect-square bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-[100px] absolute inset-0" />
                   <div className="relative rounded-[3rem] border-2 border-border bg-card p-4 shadow-2xl overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="bg-muted aspect-video rounded-[2.5rem] flex items-center justify-center p-8">
                         <div className="text-center">
                            <Smartphone className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
                            <p className="font-black text-xl uppercase tracking-widest">Optimized for iOS & Android</p>
                         </div>
                      </div>
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
                   <Button onClick={handleTryDemo} className="h-16 px-10 rounded-2xl bg-background text-foreground font-black uppercase tracking-widest text-xs hover:bg-background/90 transition-all">
                     Launch Demo
                   </Button>
                   <Link to="/auth/signup">
                     <Button variant="ghost" className="h-16 px-10 rounded-2xl text-background/80 hover:text-background font-bold text-lg">
                       Create Account <ArrowRight className="ml-2 h-5 w-5" />
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
                 <span className="font-black italic text-lg uppercase">NEXA</span>
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">© 2026 NEXA CORE TECHNOLOGY</p>
              <div className="flex gap-8 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                 <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                 <a href="#" className="hover:text-primary transition-colors">GitHub</a>
                 <a href="#" className="hover:text-primary transition-colors">Docs</a>
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
