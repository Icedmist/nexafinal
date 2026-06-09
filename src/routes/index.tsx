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
  MapPin,
  Check,
  Smartphone,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import nexaLogo from "@/assets/nexa-logo.svg";
import type { Store } from "@/types/tenant";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4 ${scrolled ? "bg-[#0A1F44]/95 backdrop-blur-xl border-b border-white/5 shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-[#00C2FF]/10 rounded-2xl p-2 border border-[#00C2FF]/20 transition-transform group-hover:rotate-12">
            <img src={nexaLogo} className="h-8 w-8 invert brightness-0" alt="NEXA Logo" />
          </div>
          <span className="text-xl font-black font-['Montserrat',sans-serif] text-white tracking-tight uppercase italic">NEXA Store OS</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/app/dashboard">
              <Button className="rounded-xl font-black bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-[#0A1F44] uppercase text-[10px] tracking-widest gap-2">
                Dashboard <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth/login">
                <Button variant="ghost" className="font-bold text-sm text-slate-200 hover:text-white rounded-xl">Login</Button>
              </Link>
              <Link to="/auth/signup">
                <Button className="rounded-xl font-black bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-[#0A1F44] uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-[#00C2FF]/20">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  const { store, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    // Dynamically append Montserrat Font to document head
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (store && user) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [store, user, navigate]);

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A1F44]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00C2FF] border-t-transparent" />
      </div>
    );
  }

  if (store) {
    if (user) return null;
    return <StoreLoginPage store={store} />;
  }

  return (
    <div className="min-h-screen bg-[#0A1F44] text-white overflow-x-hidden selection:bg-[#00C2FF]/30 font-sans">
      <Nav />

      {/* ── SECTION 1: THE HERO (THE HOOK) ── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-36 px-6 overflow-hidden bg-gradient-to-b from-[#0A1C2D] to-[#0A1F44]">
        {/* Glow and nodes background container */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00C2FF]/5 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#1A73E8]/5 blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/5 px-4 py-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-[#00C2FF] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00C2FF]">v2.0 Store OS</span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-['Montserrat',sans-serif] leading-[1.05] tracking-tighter text-white uppercase italic">
                  Wake Up to Your Shop’s Profit Before You Even Leave Bed.
                </h1>

                <p className="text-base md:text-lg text-slate-300 font-medium leading-relaxed max-w-xl">
                  The complete, WhatsApp-native inventory and sales system built specifically for Northern Nigerian businesses. No expensive hardware required—run your entire shop from the phone you already own.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <Link to="/auth/signup" className="flex-1 sm:flex-initial">
                      <Button className="w-full h-16 px-10 bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-[#0A1F44] rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#00C2FF]/20 hover:scale-[1.03] transition-all">
                        Claim 1 of 30 Launch Spots
                      </Button>
                    </Link>
                    <Link to="/auth/login" className="flex-1 sm:flex-initial">
                      <Button variant="outline" className="w-full h-16 px-10 rounded-2xl font-bold text-sm border-white/20 hover:bg-white/5 text-white">
                        Portal Login
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FFB800]">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>30-Day 100% Money-Back Guarantee</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Phone Mockup */}
            <div className="lg:col-span-5 relative flex justify-center">
              {/* Subtle 3D glowing cyan nodes behind the phone */}
              <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-50">
                <svg width="450" height="450" viewBox="0 0 400 400" fill="none" className="animate-pulse duration-4000">
                  <circle cx="200" cy="200" r="110" stroke="#00C2FF" strokeWidth="1" strokeDasharray="6 6" />
                  <circle cx="200" cy="200" r="160" stroke="#00C2FF" strokeWidth="0.5" />
                  <circle cx="100" cy="120" r="6" fill="#00C2FF" />
                  <circle cx="300" cy="280" r="4" fill="#00C2FF" />
                  <circle cx="280" cy="100" r="5" fill="#00C2FF" />
                  <circle cx="120" cy="270" r="4" fill="#00C2FF" />
                  <line x1="100" y1="120" x2="200" y2="200" stroke="#00C2FF" strokeWidth="0.75" />
                  <line x1="300" y1="280" x2="200" y2="200" stroke="#00C2FF" strokeWidth="0.75" />
                  <line x1="280" y1="100" x2="200" y2="200" stroke="#00C2FF" strokeWidth="0.75" />
                  <line x1="120" y1="270" x2="200" y2="200" stroke="#00C2FF" strokeWidth="0.75" />
                </svg>
              </div>

              {/* CSS Phone Mockup */}
              <div className="relative w-[290px] h-[580px] rounded-[3rem] border-8 border-slate-800 bg-slate-950 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden ring-4 ring-[#00C2FF]/20 flex flex-col justify-between p-3 select-none">
                {/* Speaker/Camera notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-slate-950 rounded-full" />
                </div>

                {/* Screen Content */}
                <div className="flex-1 bg-[#0A1C2D] rounded-[2.2rem] overflow-hidden flex flex-col p-4 pt-6 text-left">
                  {/* Screen Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-white tracking-widest uppercase">NexaStoreOS</span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-400">12:30 PM</span>
                  </div>

                  {/* Profit Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-3">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Yesterday's Profit</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xl font-black font-mono text-[#00C2FF]">₦48,500</span>
                      <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+12.4%</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
                      <p className="text-[10px] font-bold text-white mt-0.5">Musa & Fatima</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
                      <p className="text-[10px] font-black font-mono text-white mt-0.5">38 orders</p>
                    </div>
                  </div>

                  {/* Live feed */}
                  <div className="flex-1 space-y-2 overflow-hidden">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recent Activity</span>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-white">Indomie Onion 40g</p>
                        <p className="text-[7px] text-slate-400">120 units sold by Musa</p>
                      </div>
                      <span className="text-[8px] font-bold text-[#00C2FF]">₦12,500</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-white">Peak Milk 400g</p>
                        <p className="text-[7px] text-slate-400">Credit sale to Alhaji Musa</p>
                      </div>
                      <span className="text-[8px] font-bold text-[#FFB800]">₦15,000</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <p className="text-[8px] text-emerald-300 font-bold leading-tight">Monnify POS payment: ₦6,500 received</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: BENTO BOX SOCIAL PROOF ── */}
      <section className="bg-[#0A1F44] py-24 px-6 relative overflow-hidden border-t border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00C2FF]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Built for Jalingo, Gombe & Maiduguri */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col justify-between hover:border-[#00C2FF]/30 transition-all group min-h-[220px]">
              <div className="h-12 w-12 rounded-2xl bg-[#00C2FF]/10 flex items-center justify-center text-[#00C2FF] mb-6 shadow-inner">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Montserrat',sans-serif] text-white tracking-tight mb-2">
                  Built for Jalingo, Gombe & Maiduguri.
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Designed explicitly for Northern Nigerian retail reality, bandwidth constraints, and local commerce flow.
                </p>
              </div>
            </div>

            {/* Card 2: 100% WhatsApp Native */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col justify-between hover:border-[#00C2FF]/30 transition-all group min-h-[220px]">
              <div className="h-12 w-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] mb-6 shadow-inner ring-2 ring-[#25D366]/20">
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.768 1.543 5.404L2 22l4.764-1.25c1.554.848 3.31 1.258 5.236 1.258 5.524 0 10.004-4.48 10.004-10.004C22.004 6.48 17.528 2 12.004 2zm0 16.5c-1.745 0-3.376-.482-4.78-1.325l-.343-.205-2.82.74.753-2.75-.225-.358c-.927-1.478-1.42-3.21-1.42-5.006 0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5zm4.615-6.315c-.253-.127-1.5-.74-1.733-.824-.233-.085-.403-.127-.573.127-.17.254-.658.824-.805.993-.147.17-.294.19-.547.063-.253-.127-1.07-.394-2.037-1.257-.753-.672-1.26-1.502-1.408-1.756-.148-.253-.016-.39.11-.516.114-.114.254-.296.38-.445.128-.148.17-.253.254-.423.085-.17.042-.317-.02-.444-.064-.127-.573-1.38-.785-1.892-.206-.502-.413-.434-.572-.442l-.488-.007c-.17 0-.445.063-.678.317-.233.254-.89.87-.89 2.122 0 1.25.91 2.457 1.037 2.627.127.17 1.79 2.735 4.337 3.834.606.262 1.08.418 1.448.535.61.194 1.165.166 1.604.1.488-.073 1.5-.612 1.71-1.205.212-.593.212-1.1.148-1.205-.063-.105-.233-.147-.487-.274z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Montserrat',sans-serif] text-white tracking-tight mb-2">
                  100% WhatsApp Native.
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Your customers don't need to download any new apps. They place orders and receive notifications directly inside WhatsApp.
                </p>
              </div>
            </div>

            {/* Card 3: Integrates seamlessly with Monnify */}
            <div className="md:col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-[#00C2FF]/30 transition-all group min-h-[180px]">
              <div className="space-y-3 max-w-2xl text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C2FF]/10 border border-[#00C2FF]/20 text-[#00C2FF] text-[10px] font-black uppercase tracking-wider">
                  Payment Automation
                </div>
                <h3 className="text-2xl font-bold font-['Montserrat',sans-serif] text-white tracking-tight">
                  Integrates seamlessly with Monnify.
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                  Your POS takes the payment, NexaStoreOS tracks the inventory. Receive instant notifications for transfers and POS transactions without manual statement auditing.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 w-full md:w-auto justify-center">
                <div className="h-10 px-4 bg-white/10 rounded-lg flex items-center justify-center text-white font-extrabold tracking-widest text-xs uppercase">
                  MONNIFY
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="h-10 px-4 bg-white/10 rounded-lg flex items-center justify-center text-white font-extrabold tracking-widest text-xs uppercase">
                  NEXA OS
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: THE DISPLACEMENT STRATEGY ── */}
      <section className="bg-white py-24 px-6 relative text-[#0A1F44]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-6xl font-black font-['Montserrat',sans-serif] uppercase tracking-tight">
              Outgrow Your Old Systems Today.
            </h2>
            <p className="text-slate-500 font-medium italic">
              Legacy tools hold your retail profit back. Nexa shifts your store into autopilot.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Comparison 1 */}
            <div className="border border-slate-200 rounded-[2.5rem] p-8 bg-[#F4F6F8] flex flex-col justify-between hover:shadow-xl transition-all text-left">
              <div className="space-y-6">
                <div className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-200 text-slate-700 rounded-full">
                  Vs. Manual Ledgers
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-red-500 pl-4 py-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-500">The Problem</h4>
                    <p className="text-sm font-bold text-[#0A1F44] mt-1 leading-snug">
                      What happens if the book gets lost in a fire or flood?
                    </p>
                  </div>
                  <div className="border-l-4 border-emerald-500 pl-4 py-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500">Nexa Solution</h4>
                    <p className="text-sm font-bold text-slate-600 mt-1 leading-snug">
                      Cloud backup forever. Search your sales in 30 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison 2 */}
            <div className="border border-slate-200 rounded-[2.5rem] p-8 bg-[#F4F6F8] flex flex-col justify-between hover:shadow-xl transition-all text-left">
              <div className="space-y-6">
                <div className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-200 text-slate-700 rounded-full">
                  Vs. Excel / Spreadsheets
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-red-500 pl-4 py-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-500">The Problem</h4>
                    <p className="text-sm font-bold text-[#0A1F44] mt-1 leading-snug">
                      Crashes when two staff edit at once. Doesn't send receipts.
                    </p>
                  </div>
                  <div className="border-l-4 border-emerald-500 pl-4 py-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500">Nexa Solution</h4>
                    <p className="text-sm font-bold text-slate-600 mt-1 leading-snug">
                      Multi-user access with automated digital receipts. (Plus, we import your Excel data for free).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison 3 */}
            <div className="border border-slate-200 rounded-[2.5rem] p-8 bg-[#F4F6F8] flex flex-col justify-between hover:shadow-xl transition-all text-left">
              <div className="space-y-6">
                <div className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-200 text-slate-700 rounded-full">
                  Vs. Basic POS Systems
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-red-500 pl-4 py-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-500">The Problem</h4>
                    <p className="text-sm font-bold text-[#0A1F44] mt-1 leading-snug">
                      You know you got paid, but what exactly did you sell?
                    </p>
                  </div>
                  <div className="border-l-4 border-emerald-500 pl-4 py-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500">Nexa Solution</h4>
                    <p className="text-sm font-bold text-slate-600 mt-1 leading-snug">
                      Complete inventory tracking overlaid on your digital payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: THE ADDICTION ENGINE ── */}
      <section className="bg-[#F4F6F8] py-24 px-6 relative overflow-hidden text-[#0A1F44]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C2FF]/10 border border-[#00C2FF]/20 text-[#00C2FF] text-[10px] font-black uppercase tracking-wider">
                  Automated Intelligence
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-['Montserrat',sans-serif] uppercase tracking-tight leading-[1.1]">
                  Your Business Intelligence, Delivered Instantly.
                </h2>
              </div>

              {/* Interactive Tabs */}
              <div className="space-y-4">
                {/* Feature 1 */}
                <button
                  type="button"
                  onClick={() => setActiveFeature(0)}
                  className={`w-full text-left p-6 rounded-[2rem] border transition-all flex gap-4 items-start ${
                    activeFeature === 0
                      ? "bg-white border-[#00C2FF] shadow-lg"
                      : "bg-transparent border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeFeature === 0 ? "bg-[#00C2FF]/10 text-[#00C2FF]" : "bg-slate-200 text-slate-600"
                  }`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">8 AM Daily Summaries</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                      Start your day knowing yesterday's exact revenue and top-selling items.
                    </p>
                  </div>
                </button>

                {/* Feature 2 */}
                <button
                  type="button"
                  onClick={() => setActiveFeature(1)}
                  className={`w-full text-left p-6 rounded-[2rem] border transition-all flex gap-4 items-start ${
                    activeFeature === 1
                      ? "bg-white border-[#00C2FF] shadow-lg"
                      : "bg-transparent border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeFeature === 1 ? "bg-[#00C2FF]/10 text-[#00C2FF]" : "bg-slate-200 text-slate-600"
                  }`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Instant Low-Stock Alerts</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                      Never miss a sale. Get a WhatsApp ping the second your fast-moving items hit the reorder point.
                    </p>
                  </div>
                </button>

                {/* Feature 3 */}
                <button
                  type="button"
                  onClick={() => setActiveFeature(2)}
                  className={`w-full text-left p-6 rounded-[2rem] border transition-all flex gap-4 items-start ${
                    activeFeature === 2
                      ? "bg-white border-[#00C2FF] shadow-lg"
                      : "bg-transparent border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeFeature === 2 ? "bg-[#00C2FF]/10 text-[#00C2FF]" : "bg-slate-200 text-slate-600"
                  }`}>
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Live Payment Tracking</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                      Instant notifications the moment a customer pays.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Mockup */}
            <div className="lg:col-span-5 flex justify-center relative">
              <div className="absolute inset-0 bg-[#00C2FF]/10 blur-[100px] rounded-full pointer-events-none" />

              {/* Lockscreens Phone Mockup */}
              <div className="relative w-[280px] h-[560px] rounded-[3rem] border-8 border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-3 flex flex-col justify-between select-none">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-3.5 bg-slate-800 rounded-full z-20" />
                
                {/* Phone screen wallpaper */}
                <div className="flex-1 bg-gradient-to-b from-[#0A1F44] via-[#0A1C2D] to-slate-950 rounded-[2.2rem] overflow-hidden flex flex-col p-4 pt-12 relative text-left">
                  
                  {/* Lock Screen Time */}
                  <div className="text-center space-y-0.5 mb-8">
                    <span className="text-white text-3xl font-black tracking-tight">08:00</span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saturday, June 6</p>
                  </div>

                  {/* Lock Screen Notification Cards Stack */}
                  <div className="space-y-3 flex-1 flex flex-col justify-start">
                    
                    {activeFeature === 0 && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 bg-[#25D366] rounded-full flex items-center justify-center text-white text-[8px] font-bold">W</div>
                            <span className="text-[9px] font-black text-white">Nexa Store OS</span>
                          </div>
                          <span className="text-[7px] text-slate-400">now</span>
                        </div>
                        <p className="text-[10px] font-bold text-white leading-snug">📊 Daily Report: Alhaji & Sons</p>
                        <p className="text-[9px] text-slate-300 mt-1 leading-snug">
                          Good morning Fatima! Yesterday's profit was <b>₦48,500</b>. Top selling item: <b>Indomie Onion 40g</b>.
                        </p>
                      </div>
                    )}

                    {activeFeature === 1 && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 bg-[#25D366] rounded-full flex items-center justify-center text-white text-[8px] font-bold">W</div>
                            <span className="text-[9px] font-black text-white">Nexa Inventory Bot</span>
                          </div>
                          <span className="text-[7px] text-slate-400">now</span>
                        </div>
                        <p className="text-[10px] font-bold text-[#FFB800] leading-snug">⚠️ Low Stock Warning</p>
                        <p className="text-[9px] text-slate-300 mt-1 leading-snug">
                          <b>Peak Milk 400g</b> is down to 4 tins. Standard restock quantity is 2 cartons. Reply "RESTOCK" to trigger order.
                        </p>
                      </div>
                    )}

                    {activeFeature === 2 && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 bg-[#25D366] rounded-full flex items-center justify-center text-white text-[8px] font-bold">W</div>
                            <span className="text-[9px] font-black text-white">Nexa Pay Alert</span>
                          </div>
                          <span className="text-[7px] text-slate-400">now</span>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-400 leading-snug">✅ Payment Verified</p>
                        <p className="text-[9px] text-slate-300 mt-1 leading-snug">
                          Fatima Ali transferred <b>₦6,500</b> via Monnify. Inventory for Order #2839 was automatically updated.
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Lock Screen Bottom Swipe indicator */}
                  <div className="text-center pt-2">
                    <span className="inline-block h-1 w-24 bg-white/30 rounded-full" />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 5: THE GRAND SLAM LAUNCH OFFER ── */}
      <section className="bg-white py-24 px-6 relative text-[#0A1F44]">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black font-['Montserrat',sans-serif] uppercase tracking-tight">
              Premium Retail Tech, Priced for Local Reality.
            </h2>
            <p className="text-slate-500 font-medium italic">
              Simple pricing designed to align our incentives with your retail growth.
            </p>
          </div>

          {/* Founding Member Highlight Box */}
          <div className="bg-[#F4F6F8] rounded-[2.5rem] border-4 border-[#FFB800] p-8 md:p-12 shadow-2xl relative overflow-hidden text-left">
            {/* Yellow Tag */}
            <div className="absolute top-0 right-0 bg-[#FFB800] text-[#0A1F44] px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
              Limited spots
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-black font-['Montserrat',sans-serif] uppercase">
                  The Nexa Launch Offer
                </h3>
                <p className="text-sm font-black text-[#FFB800] uppercase tracking-widest mt-1">
                  First 30 Clients Only
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black">₦6,500</span>
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">/ Month</span>
                <span className="text-xs font-bold text-slate-500 ml-4 line-through">₦26,000 Setup Waived</span>
              </div>

              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Start today on our Business Plan and we will completely waive all onboarding, configuration, and data-import costs.
              </p>

              {/* Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/50 pt-8">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold">FREE Setup & Configuration</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold">FREE Data Import from existing systems</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold">FREE 1-on-1 Staff Training Session</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold">FREE 30-day priority WhatsApp support</span>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4">
                <Link to="/auth/signup">
                  <Button className="w-full h-14 bg-[#00C2FF] hover:bg-[#00C2FF]/95 text-[#0A1F44] rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-[#00C2FF]/30 transition-transform hover:scale-[1.01]">
                    Claim 1 of 30 Launch Spots
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Guarantee Box */}
          <div className="bg-[#0A1F44] rounded-[2.5rem] p-8 md:p-12 text-center border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h3 className="text-base font-black uppercase tracking-widest text-[#FFB800]">
                THE NEXA GUARANTEE
              </h3>
              <p className="text-white text-lg font-bold italic leading-relaxed">
                "THE NEXA GUARANTEE: If after 30 days you do not feel NexaStoreOS has saved you more than it costs, we will refund every kobo. No questions asked. Every sales resistance collapses when risk is zero."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: LOCAL LEADERSHIP & FOOTER ── */}
      <section className="bg-[#0A1F44] py-24 px-6 relative border-t border-white/5">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            {/* Visual Portrait */}
            <div className="md:col-span-4 flex justify-center">
              <div className="relative h-48 w-48 rounded-full p-1.5 bg-gradient-to-tr from-[#00C2FF] via-[#1A73E8] to-[#17A2B8] shadow-2xl">
                <div className="h-full w-full rounded-full bg-[#0B1C2D] flex items-center justify-center overflow-hidden">
                  <svg className="h-32 w-32 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-[#FFB800] text-[#0A1F44] font-black uppercase text-[8px] tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                  CEO
                </div>
              </div>
            </div>

            {/* Copy */}
            <div className="md:col-span-8 space-y-6 text-left">
              <h3 className="text-xl font-black font-['Montserrat',sans-serif] text-white uppercase tracking-tight">
                Local Support on the Ground
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-medium">
                "Lagos companies can't teleport staff to Taraba State. We are here on the ground. Nexa Digital Solutions LTD is building intelligent business systems right where you operate, ensuring you have the local support you need to scale."
              </p>
              <div>
                <p className="text-sm font-black text-white uppercase tracking-widest">Abdulrasheed Mahmoud Bello</p>
                <p className="text-[10px] font-bold text-[#00C2FF] uppercase tracking-wider">CEO, Nexa Digital Solutions LTD</p>
              </div>
            </div>
          </div>

          {/* Final CTA Button & Contacts */}
          <div className="border-t border-white/5 pt-12 text-center space-y-8">
            <Link to="/auth/signup">
              <Button className="h-16 px-10 bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-[#0A1F44] rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-[#00C2FF]/20 hover:scale-105 transition-all">
                Book Your Free Demo Today
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 text-xs font-bold text-slate-400 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-md bg-[#00C2FF]/10 flex items-center justify-center text-[#00C2FF]">
                  <img src={nexaLogo} className="h-4 w-4 invert brightness-0" alt="NEXA Logo" />
                </div>
                <span className="font-black text-white uppercase">NexaStoreOS</span>
              </div>
              <p className="uppercase tracking-wider">
                Phone: <a href="tel:09038026109" className="hover:text-white transition-colors">09038026109</a> | Lamurde Street Barade, Jalingo | Nexa Digital Solutions LTD
              </p>
              <div className="flex items-center gap-4 uppercase text-[10px] tracking-wider">
                <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                <span className="text-white/20">|</span>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </div>
              <p className="uppercase tracking-widest text-[10px]">© 2026 NEXA Digital Solutions LTD</p>
            </div>
          </div>
        </div>
      </section>
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
