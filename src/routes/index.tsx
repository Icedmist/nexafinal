import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDemo } from "@/hooks/useDemo";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useState, useEffect } from "react";
import { BusinessOnboarding } from "@/components/onboarding/BusinessOnboarding";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
} from "lucide-react";
import heroBox3d from "@/assets/hero-box.png";
import uiScreenshot from "@/assets/ui-screenshot-dashboard-v2.png.asset.json";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "NEXA Store OS — Inventory Command Center" },
      {
        name: "description",
        content:
          "Real-time inventory management for businesses of any size. Track stock, manage suppliers, automate reorders, and keep your team aligned.",
      },
      { property: "og:title", content: "NEXA Store OS — Inventory Command Center" },
      {
        property: "og:description",
        content:
          "Real-time inventory management for businesses of any size. Track stock, manage suppliers, automate reorders, and keep your team aligned.",
      },
    ],
  }),
});

/* ─── Data ──────────────────────────────────────────── */
const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Analytics", href: "#analytics" },
];

const solutions = [
  {
    icon: BarChart3,
    title: "Real-time tracking",
    description: "Monitor stock levels across every location with live dashboards and instant status updates.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Bell,
    title: "Smart reorders",
    description: "Automated thresholds and AI-powered forecasting prevent stockouts before they happen.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Truck,
    title: "Supplier management",
    description: "Unified view of contacts, lead times, purchase history, and performance scoring.",
    color: "bg-accent/20 text-accent-foreground",
  },
  {
    icon: TrendingUp,
    title: "Analytics & reports",
    description: "Turn movement data into insights with trend charts, turnover analysis, and exports.",
    color: "bg-primary/10 text-primary",
  },
];

const featureTabs = [
  {
    label: "Dashboard",
    description: "See what matters most: stock levels, pending orders, recent movements, and alerts that need attention.",
    image: uiScreenshot.url,
  },
  {
    label: "Catalog",
    description: "Powerful search, filters, bulk actions, and custom fields let you manage hundreds of SKUs effortlessly.",
    image: uiScreenshot.url,
  },
  {
    label: "Analytics",
    description: "From stock trends to supplier performance, turn raw data into actionable insights and forecasts.",
    image: uiScreenshot.url,
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Real-time tracking",
    description: "Monitor stock levels across every location as changes happen, with instant dashboards and live status indicators.",
  },
  {
    icon: Bell,
    title: "Smart reorder alerts",
    description: "Get notified before you run out. Automated thresholds and AI-powered forecasting keep shelves stocked.",
  },
  {
    icon: Truck,
    title: "Supplier management",
    description: "Organize contacts, lead times, and purchase history in one unified view with performance scoring.",
  },
  {
    icon: ScanLine,
    title: "Barcode scanning",
    description: "Speed up receiving and cycle counts with built-in barcode support and quick-entry mode.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & reports",
    description: "Turn movement data into insights with trend charts, turnover analysis, and exportable reports.",
  },
  {
    icon: Users,
    title: "Team roles & permissions",
    description: "Control who can view, edit, or approve with granular role-based access and approval workflows.",
  },
];

const capabilities = [
  { icon: Shield, text: "Role-based access" },
  { icon: Globe, text: "Multi-location support" },
  { icon: ScanLine, text: "Barcode ready" },
  { icon: Zap, text: "AI-powered insights" },
];

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
      className={`transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function StickyNav({ onTryDemo }: { onTryDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 border-b border-border shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="bg-primary rounded-xl p-1.5 transition-transform group-hover:rotate-12">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            NEXA Store OS
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-semibold text-muted-foreground transition-all hover:text-primary hover:scale-105"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA - secondary style */}
        <button
          type="button"
          onClick={onTryDemo}
          className="hidden items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-6 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground md:inline-flex shadow-sm hover:shadow-primary/20"
        >
          Try demo
        </button>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-lg px-6 pb-8 md:hidden">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="block py-4 text-base font-semibold text-muted-foreground transition-colors hover:text-primary border-b border-border/50"
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onTryDemo();
            }}
            className="mt-6 w-full rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-lg"
          >
            Try demo
          </button>
        </div>
      )}
    </nav>
  );
}

function BrowserFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl ${className}`}>
      <div className="flex items-center gap-2 border-b border-border/30 bg-muted/30 px-6 py-4">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-destructive/40" />
          <div className="h-3 w-3 rounded-full bg-secondary/40" />
          <div className="h-3 w-3 rounded-full bg-stock-healthy/40" />
        </div>
        <div className="mx-auto text-[10px] text-muted-foreground/50 font-mono tracking-widest uppercase">nexa-os-v2.0</div>
      </div>
      {children}
    </div>
  );
}

function FeatureTabsSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="analytics" className="px-6 py-24 sm:py-32 bg-muted/30">
      <RevealSection className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          Product tour
        </div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Drive your business forward
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Explore the modules that give you complete control over your supply chain, from dashboard to deep analytics.
        </p>
      </RevealSection>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:gap-16">
        {/* Tab list */}
        <div className="flex justify-center gap-3 overflow-x-auto pb-4 lg:w-96 lg:shrink-0 lg:justify-start lg:flex-col lg:gap-4 lg:pb-0">
          {featureTabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`shrink-0 rounded-2xl p-6 text-left transition-all duration-300 lg:w-full ${
                activeTab === i
                  ? "bg-card text-foreground shadow-xl ring-1 ring-primary/20 scale-[1.02]"
                  : "bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${activeTab === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                   {i === 0 ? <BarChart3 className="h-4 w-4" /> : i === 1 ? <Package className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                </div>
                <span className="font-bold text-base">{tab.label}</span>
              </div>
              <p className={`text-sm leading-relaxed ${activeTab === i ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                {tab.description}
              </p>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 relative">
           <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10 transform scale-75 translate-y-10" />
          <BrowserFrame>
            <img
              src={featureTabs[activeTab].image}
              alt={`NEXA Store OS ${featureTabs[activeTab].label} view`}
              className="w-full transition-opacity duration-500 rounded-b-2xl"
              key={activeTab}
            />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

function StoreLoginPage({ store }: { store: any }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(`Welcome back to ${store.name}`);
      navigate({ to: "/app/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 flex text-primary mb-6">
             <Package className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Sign into {store.name}</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Enter your staff credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6 rounded-[2rem] border border-border bg-card p-8 shadow-2xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@store.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" disabled={loading}>
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Store OS by NEXA Core
        </p>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
function LandingPage() {
  const { enterDemoMode } = useDemo();
  const { store, loading: tenantLoading } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      navigate({ to: "/app/dashboard" });
    }
  }, [user, navigate]);

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (store) {
    return <StoreLoginPage store={store} />;
  }

  const handleTryDemo = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = (_businessType: string, _categories: string[], _storeName: string) => {
    enterDemoMode({ businessType: _businessType, categories: _categories, storeName: _storeName, storePhone: "", storeAddress: "", receiptFooter: "Thank you for your patronage!", taxRate: 0 });
    localStorage.setItem("nexa-onboarding-done", "true");
    localStorage.setItem("nexa-business-type", _businessType);
    localStorage.setItem("nexa-categories", JSON.stringify(_categories));
    localStorage.setItem("nexa-store-name", _storeName);
    setShowOnboarding(false);
    navigate({ to: "/app/dashboard" });
  };

  const handleOnboardingSkip = () => {
    enterDemoMode();
    localStorage.setItem("nexa-onboarding-done", "true");
    setShowOnboarding(false);
    navigate({ to: "/app/dashboard" });
  };

  return (
    <>
    {showOnboarding && (
      <BusinessOnboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
    )}
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <StickyNav onTryDemo={handleTryDemo} />

      {/* ── Split Hero ─────────────────────────────────── */}
      <section className="relative px-6 pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center relative">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-radial from-primary/10 to-transparent blur-3xl -z-10" />
          
          <div className="animate-float mb-8">
            <img
              src={heroBox3d}
              alt="3D illustration of a cardboard box"
              className="mx-auto w-56 drop-shadow-2xl sm:w-64 transform -rotate-6"
            />
          </div>

          <RevealSection>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-6">
              <Layers className="h-3 w-3" />
              The Future of Inventory
            </div>
            <h1 className="text-[40px] font-black leading-[1.05] tracking-tight sm:text-[64px] lg:text-[76px] bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              The OS for modern <br className="hidden sm:block" /> retail commerce.
            </h1>
          </RevealSection>

          <RevealSection delay={100}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl font-medium">
              Track stock, manage suppliers, and automate reorders from one powerful command center designed for rapid scaling.
            </p>
          </RevealSection>

          <RevealSection delay={200} className="mt-12 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={handleTryDemo}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              Launch Demo
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="flex -space-x-3 items-center">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                </div>
              ))}
              <span className="ml-4 text-xs font-bold text-muted-foreground">Trusted by 500+ store owners</span>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Solutions Grid ─────────────────────────────── */}
      <section id="solutions" className="px-6 py-24 sm:py-32">
        <RevealSection className="text-center mb-16">
          <div className="inline-block rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4">
            Solutions
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for modern inventory teams
          </h2>
        </RevealSection>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {solutions.map((s, i) => (
            <RevealSection key={s.title} delay={i * 100} className="h-full">
              <div className="group h-full rounded-3xl border border-border bg-card/50 p-8 transition-all duration-300 hover:bg-card hover:shadow-2xl hover:-translate-y-2">
                <div className={`mb-6 inline-flex rounded-2xl p-4 ${s.color} shadow-inner`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-medium">{s.description}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── Product Showcase ── */}
      <section className="px-6 py-16">
        <RevealSection>
          <div className="mx-auto max-w-6xl">
            <BrowserFrame className="shadow-2xl shadow-primary/10">
              <img
                src={uiScreenshot.url}
                alt="NEXA Store OS dashboard showing inventory metrics"
                className="w-full"
                loading="lazy"
              />
            </BrowserFrame>
          </div>
        </RevealSection>
      </section>

      {/* ── Feature Tabs ───────────────────────────────── */}
      <FeatureTabsSection />

      {/* ── Feature Grid ─────────────────────────────── */}
      <section id="features" className="px-6 py-24 sm:py-32">
        <RevealSection className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need in one OS
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground font-medium">
            A comprehensive suite of modules built to handle the complexities of modern commerce.
          </p>
        </RevealSection>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <RevealSection key={f.title} delay={i * 80}>
              <div className="group rounded-3xl border border-border bg-card/40 p-8 transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-xl">
                <div className="mb-6 inline-flex rounded-xl bg-primary p-3 shadow-lg shadow-primary/20">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 text-base font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-medium">{f.description}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── Capabilities Row ─────────────────────────── */}
      <section className="px-6 py-24 bg-muted/20">
        <RevealSection>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
            {capabilities.map((c) => (
              <div
                key={c.text}
                className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center transition-transform hover:scale-105"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <c.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">{c.text}</span>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] bg-foreground px-8 py-20 text-center sm:px-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-50" />
          <RevealSection className="relative z-10">
            <div className="bg-background/10 backdrop-blur-md rounded-2xl p-4 inline-block mb-8">
              <Package className="h-10 w-10 text-background" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-background sm:text-5xl lg:text-6xl mb-6">
              Ready to scale?
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg text-background/60 font-medium">
              Start managing your inventory like a pro with NEXA Store OS. No credit card required.
            </p>
            <div className="mt-12">
              <button
                type="button"
                onClick={handleTryDemo}
                className="group inline-flex items-center gap-3 rounded-2xl bg-background px-10 py-5 text-lg font-black text-foreground shadow-2xl transition-all hover:scale-105 hover:bg-background/90 active:scale-95"
              >
                Launch NEXA OS
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 group">
            <div className="bg-primary rounded-lg p-1.5">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">NEXA Store OS</span>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            © {new Date().getFullYear()} NEXA Core Technology. All rights reserved.
          </div>
          <div className="flex gap-6">
             <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary">Twitter</a>
             <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary">Github</a>
             <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary">Terms</a>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
