import { useNavigate, Link } from "react-router-dom";
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
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";
import heroMockup from "@/assets/landing/hero-mockup.png";
import nexaLogo from "@/assets/nexa-logo.svg";
import type { Store } from "@/types/tenant";

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

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function LandingPage() {
  const { store, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (store && user) {
      navigate("/app/dashboard", { replace: true });
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

  const features = [
    {
      title: "QR & Barcode Ready",
      desc: "Scan and track with ease. Integrated support for QR and Barcodes across POS and inventory checks.",
      icon: <ScanLine className="h-8 w-8" />,
      color: "bg-amber-500",
    },
    {
      title: "Global Inventory",
      desc: "Real-time tracking across all your branches. Manage stock levels with precision and zero latency.",
      icon: <Package className="h-8 w-8" />,
      color: "bg-primary",
    },
    {
      title: "Customer Follow-up",
      desc: "Built-in CRM to track purchase history and automate follow-ups via WhatsApp or Email.",
      icon: <Users className="h-8 w-8" />,
      color: "bg-green-500",
    },
    {
      title: "Simple Navigation",
      desc: "Clean, non-cluttered interface. Switch between power-user and simple modes instantly.",
      icon: <LayoutDashboard className="h-8 w-8" />,
      color: "bg-blue-500",
    },
    {
      title: "AI Insights",
      desc: "Intelligent forecasting and reorder alerts. Let our OS predict your next big move.",
      icon: <Sparkles className="h-8 w-8" />,
      color: "bg-purple-500",
    },
    {
      title: "Role Security",
      desc: "Granular role-based access control. Secure data isolation for staff, managers, and owners.",
      icon: <Shield className="h-8 w-8" />,
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 font-sans">
      <Nav />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 lg:pt-56 lg:pb-40 px-6">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[0%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">v2.0 Store OS</span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter mb-10 bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent uppercase italic">
              Retail <br /> Reimagined.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed mb-12">
              The unified operating system for modern commerce. Track every unit, manage global teams, and scale your vision with speed.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <Link to="/auth/signup">
                <Button className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-2xl shadow-primary/40 hover:scale-105 transition-transform">
                  Launch Your OS <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="outline" className="h-16 px-10 rounded-2xl font-bold text-sm border-2">
                  Portal Login
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES CARDS ── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">Built for Performance</h2>
            <p className="text-muted-foreground font-medium italic">Everything you need to run a high-velocity retail operation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FeatureCard 
                key={i}
                icon={feature.icon}
                title={feature.title}
                desc={feature.desc}
                color={feature.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-32 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">Fair Prices</h2>
            <p className="text-muted-foreground font-medium italic">Transparent, tiered plans that grow with your business.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <PricingCard 
              title="Starter"
              price="₦15,000"
              desc="Perfect for single stores."
              features={["1 Branch", "5 Staff Members", "QR/Barcode Support", "Basic Analytics"]}
            />
            <PricingCard 
              title="Scale"
              price="₦45,000"
              desc="For growing retail brands."
              featured={true}
              features={["Up to 5 Branches", "Unlimited Staff", "Customer CRM", "AI Insights", "Advanced Reports"]}
            />
            <PricingCard 
              title="Enterprise"
              price="Custom"
              desc="Maximum control and volume."
              features={["Unlimited Everything", "White-label Support", "Dedicated Manager", "API Access"]}
            />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-32 bg-muted/30 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase leading-none tracking-tighter">
                Loved by <br /> <span className="text-primary italic">Fast-Moving</span> <br /> Brands.
              </h2>
              <div className="space-y-6">
                <Testimonial 
                  quote="Nexa transformed our inventory management from a mess of spreadsheets to a clean, automated engine."
                  author="Sarah J."
                  role="CEO, Urban Retail"
                />
                <Testimonial 
                  quote="The speed of the POS system is unmatched. Our checkout times dropped by 40% in the first week."
                  author="David K."
                  role="Logistics Manager"
                />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative rounded-[3rem] border-2 border-border bg-card p-12 shadow-2xl space-y-8 overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                   <Sparkles className="h-10 w-10" />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tight italic text-foreground">Next-Gen Interface</h3>
                 <p className="text-muted-foreground font-medium leading-relaxed">
                   Designed for focus. We stripped away the noise of legacy ERPs to give you a tool that feels like part of your workflow, not a hurdle.
                 </p>
                 <div className="flex gap-4">
                   {[1, 2, 3, 4, 5].map((i) => (
                     <div key={i} className="h-1 flex-1 bg-primary/20 rounded-full" />
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[4rem] bg-foreground text-background p-16 md:p-32 text-center relative overflow-hidden shadow-2xl group">
           <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] group-hover:bg-primary/30 transition-colors" />
           <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-12 italic">
             The OS <br /> For Retail.
           </h2>
           <Link to="/auth/signup">
             <Button className="h-20 px-12 rounded-[2rem] bg-background text-foreground font-black uppercase tracking-[0.2em] text-xs hover:bg-background/90 transition-all shadow-2xl">
               Get Started Now
             </Button>
           </Link>
        </div>
      </section>

      <footer className="py-20 border-t border-border px-6">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="bg-primary/10 rounded-xl p-2">
                 <img src={nexaLogo} className="h-6 w-6 text-primary" alt="NEXA Logo" />
               </div>
               <span className="font-black italic text-xl uppercase tracking-tighter">NEXA Store OS</span>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">© 2026 NEXA Store OS</p>
            <div className="flex gap-8 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
               <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
               <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
         </div>
      </footer>
    </div>
  );
}

function PricingCard({ title, price, desc, features, featured }: { title: string, price: string, desc: string, features: string[], featured?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`p-10 rounded-[3rem] border-2 transition-all relative overflow-hidden flex flex-col h-full ${featured ? "bg-foreground text-background border-foreground shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] scale-105 z-10" : "bg-card border-border hover:border-primary/50"}`}
    >
      {featured && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-bl-3xl">Most Popular</div>}
      
      <div className="space-y-2 mb-8">
        <h3 className="text-xl font-black uppercase tracking-tight italic">{title}</h3>
        <p className={`${featured ? "text-background/60" : "text-muted-foreground"} text-sm font-medium`}>{desc}</p>
      </div>

      <div className="mb-10">
        <span className="text-5xl font-black tracking-tighter">{price}</span>
        {price !== "Custom" && <span className={`${featured ? "text-background/40" : "text-muted-foreground"} text-sm font-bold ml-2 uppercase tracking-widest`}>/ Month</span>}
      </div>

      <div className="space-y-4 mb-10 flex-1">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${featured ? "text-primary" : "text-primary"}`} />
            <span className="text-sm font-bold opacity-80">{f}</span>
          </div>
        ))}
      </div>

      <Link to="/auth/signup" className="w-full">
        <Button className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] ${featured ? "bg-background text-foreground hover:bg-background/90 shadow-2xl shadow-black/20" : "shadow-xl shadow-primary/20"}`}>
          Choose Plan
        </Button>
      </Link>
    </motion.div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="p-8 rounded-[2.5rem] bg-card border-2 border-border shadow-xl relative overflow-hidden group h-full cursor-pointer transition-colors hover:border-primary/50"
    >
      <div 
        style={{ transform: "translateZ(50px)" }}
        className="relative z-10"
      >
        <div className={`absolute top-0 right-0 w-32 h-32 ${color}/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity`} />
        <div className={`h-16 w-16 rounded-2xl ${color}/10 flex items-center justify-center text-foreground mb-8 shadow-inner ring-4 ring-background transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight mb-4">{title}</h3>
        <p className="text-muted-foreground font-medium text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

function Testimonial({ quote, author, role }: { quote: string, author: string, role: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-background border-2 border-border relative group hover:border-primary/50 transition-colors">
      <div className="absolute top-4 right-8 text-6xl text-primary/10 font-serif font-black">"</div>
      <p className="text-lg font-bold italic mb-6 leading-relaxed relative z-10">"{quote}"</p>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-foreground">{author}</p>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{role}</p>
      </div>
    </div>
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
      navigate("/app/dashboard");
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
          {store.branding?.logo ? (
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-[2.5rem] bg-white mb-8 shadow-2xl ring-8 ring-primary/5 group/logo hover:scale-105 transition-transform duration-500">
              <img src={store.branding.logo} className="h-full w-full object-cover" alt={store.name} />
            </div>
          ) : (
            <div className="mx-auto h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 flex text-primary mb-6 shadow-inner ring-8 ring-primary/5">
              <Building2 className="h-12 w-12" />
            </div>
          )}
          <p className="mt-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-40">Authorized Personnel Only</p>
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
          <a 
            href={(() => {
              const host = window.location.host;
              if (host.includes('localhost') || host.includes('127.0.0.1')) {
                const portPart = host.split(':')[1];
                const port = portPart ? `:${portPart}` : '';
                return `${window.location.protocol}//localhost${port}`;
              }
              const parts = host.split('.');
              if (parts.length >= 3) {
                return `${window.location.protocol}//${parts.slice(-2).join('.')}`;
              }
              return `${window.location.protocol}//nexastoreos.com`;
            })()} 
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Package className="h-3 w-3" /> NEXA OS CORE
          </a>
        </div>
      </div>
    </div>
  );
}
